import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  PRIVATE_LENGTHS, DEFAULT_PRIVATE_MINUTES, timeRange, scheduleConflicts,
  canEditBlock, blockLockedReason,
} from '../lib/privateBlocks'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Log / edit a private exam (the examiner's own company work).
 *
 *   Examiners log their own. The office can log for anyone and change
 *   anything. No examinee name — that client isn't SAPPS's.
 *   "At the SAPPS office" → the examiner's flat office fee is owed and
 *   shows on Payroll for deduction. The fee is set by the office, not here.
 */
export default function PrivateBlockModal({
  block = null, defaultDate, examiners, userId, isOffice,
  exams, privateBlocks, examinerName,
  onSave, onDelete, onClose,
}) {
  const editing = Boolean(block)
  const mine = examiners.find((e) => e.id === userId)
  const [form, setForm] = useState(() => (editing
    ? {
        examiner_id: block.examiner_id,
        block_date: block.block_date,
        start_time: String(block.start_time || '').slice(0, 5),
        duration_minutes: block.duration_minutes || DEFAULT_PRIVATE_MINUTES,
        at_office: block.at_office,
        note: block.note || '',
      }
    : {
        examiner_id: isOffice && !mine ? '' : userId,
        block_date: defaultDate || todayISO(),
        start_time: '10:00',
        duration_minutes: DEFAULT_PRIVATE_MINUTES,
        at_office: true,
        note: '',
      }))
  // Office only: override this one exam's fee. Untouched on a new block →
  // the database fills in the examiner's rate.
  const [feeOverride, setFeeOverride] = useState(editing ? String(block.office_fee ?? '') : '')
  const [feeTouched, setFeeTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const editable = !editing || canEditBlock(block, { userId, isOffice })
  const lockedWhy = editing ? blockLockedReason(block, { userId, isOffice }) : ''
  const examiner = examiners.find((e) => e.id === form.examiner_id)
  const first = examiner ? examiner.name.split(' ')[0] : ''
  const isSelf = form.examiner_id === userId

  // The fee: a saved block keeps the fee it was logged with; a new one
  // (or one switched to "at the office") uses the examiner's rate.
  const rate = examiner?.private_office_fee
  const fee = !form.at_office ? 0
    : isOffice && feeTouched ? Number(feeOverride) || 0
    : editing && block.at_office ? Number(block.office_fee) || 0
      : Number(rate) || 0

  const lengths = PRIVATE_LENGTHS.some((l) => l.value === Number(form.duration_minutes))
    ? PRIVATE_LENGTHS
    : [...PRIVATE_LENGTHS, { value: Number(form.duration_minutes), label: `${form.duration_minutes} min` }]

  const conflicts = useMemo(() => scheduleConflicts(
    { date: form.block_date, time: form.start_time, minutes: form.duration_minutes, examinerId: form.examiner_id, blockId: block?.id },
    { exams, privateBlocks, examinerName },
  ).filter((c) => c.kind !== 'private-office' || form.at_office), [form, exams, privateBlocks, examinerName, block])

  async function save() {
    setError('')
    if (!form.examiner_id) return setError('Choose whose private exam this is.')
    if (!form.block_date || !form.start_time) return setError('Date and start time are required.')
    if (!isOffice && editing && form.block_date < todayISO()) {
      return setError('A private exam can’t be moved into the past. Ask the office.')
    }
    let payload = form
    if (isOffice) {
      if (!form.at_office) payload = { ...form, office_fee: 0 }
      else if (feeTouched) {
        if (feeOverride !== '' && (Number.isNaN(Number(feeOverride)) || Number(feeOverride) < 0)) return setError('Office fee must be $0 or more.')
        payload = { ...form, office_fee: feeOverride === '' ? null : feeOverride }
      } else if (editing && !block.at_office) payload = { ...form, office_fee: null } // newly at the office → rate
    }
    setBusy(true)
    const { error: e } = await onSave(payload, block?.id || null)
    setBusy(false)
    if (e) setError(e)
    else onClose()
  }

  async function remove() {
    setBusy(true)
    const { error: e } = await onDelete(block.id)
    setBusy(false)
    if (e) { setError(e); setConfirmDelete(false) } else onClose()
  }

  const title = editing ? (editable ? 'Edit Private Exam' : 'Private Exam') : 'Log a Private Exam'
  const ro = !editable

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {lockedWhy && <div className="lock-note">{lockedWhy}</div>}

          {!editing && (
            <p className="pb-intro">
              For exams you run for your own company. This holds the time on the SAPPS calendar so
              nothing gets booked over it. No examinee details are needed, and nothing here goes into
              SAPPS reports or invoices.
            </p>
          )}

          {isOffice ? (
            <div className="field">
              <label>Examiner</label>
              <select value={form.examiner_id} onChange={set('examiner_id')} disabled={ro}>
                <option value="" disabled>Select…</option>
                {examiners.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          ) : editing && !isSelf ? (
            <div className="field"><label>Examiner</label><input type="text" value={examinerName(form.examiner_id)} readOnly /></div>
          ) : null}

          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.block_date} onChange={set('block_date')} readOnly={ro} />
            </div>
            <div className="field">
              <label>Start time</label>
              <input type="time" value={form.start_time} onChange={set('start_time')} readOnly={ro} />
            </div>
          </div>

          <div className="field">
            <label>How long to hold</label>
            <select value={form.duration_minutes} onChange={set('duration_minutes')} disabled={ro}>
              {lengths.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            {form.start_time && <span className="field-hint">Holds {timeRange(form.start_time, form.duration_minutes)}</span>}
          </div>

          <label className={`pb-office${form.at_office ? ' on' : ''}`}>
            <input type="checkbox" checked={form.at_office} onChange={set('at_office')} disabled={ro} />
            <span className="pb-office-text">
              <strong>Held at the SAPPS office</strong>
              <span>
                {!form.at_office
                  ? 'Not using the office — this only holds the time on the calendar.'
                  : fee > 0
                    ? `Office fee $${money(fee)} — deducted from ${isSelf ? 'your' : `${first}’s`} pay by payroll.`
                    : rate == null && !editing
                      ? `No office fee is on file for ${isSelf ? 'you' : first || 'this examiner'} yet — the office will set it.`
                      : 'Office fee $0.00.'}
              </span>
            </span>
          </label>

          {isOffice && form.at_office && (
            <div className="field">
              <label>Office fee for this exam</label>
              <div className="currency-input">
                <span className="currency-prefix">$</span>
                <input type="number" min="0" step="1" inputMode="decimal"
                  value={feeTouched ? feeOverride : (editing && block.at_office ? String(block.office_fee ?? '') : (rate != null ? String(rate) : ''))}
                  onChange={(e) => { setFeeTouched(true); setFeeOverride(e.target.value) }}
                  placeholder={rate != null ? String(rate) : '0'} />
              </div>
              <span className="field-hint">
                {rate != null ? `${first || 'Their'} standard rate is $${money(rate)}. Change it here for this one exam only.` : 'No standard rate on file — set one on the Payroll page.'}
              </span>
            </div>
          )}

          <div className="field">
            <label>Note <span className="pb-optional">(optional — no examinee names)</span></label>
            <input type="text" value={form.note} onChange={set('note')} maxLength={200} readOnly={ro}
              placeholder="e.g. Room B, or attorney-requested exam" />
          </div>

          {conflicts.length > 0 && (
            <div className="field-warn" role="status">
              {conflicts.map((c, i) => <div key={i}>{c.text}</div>)}
              <div className="pb-warn-sub">You can still save — just double-check the time.</div>
            </div>
          )}

          {editing && block.deducted_at && (
            <p className="field-hint">Deducted by payroll {format(parseISO(block.deducted_at), 'MMM d, yyyy')}.</p>
          )}
        </div>

        <footer className="modal-foot completion-foot">
          {confirmDelete ? (
            <div className="confirm-delete">
              <span>Remove this private exam?</span>
              <button className="btn btn-text" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep</button>
              <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</button>
            </div>
          ) : (
            <>
              <span>
                {editing && editable && (
                  <button className="btn btn-danger-text" onClick={() => setConfirmDelete(true)}>Remove</button>
                )}
              </span>
              <div className="foot-right">
                <button className="btn btn-text" onClick={onClose}>{editable ? 'Cancel' : 'Close'}</button>
                {editable && (
                  <button className="btn btn-primary" onClick={save} disabled={busy}>
                    {busy ? 'Saving…' : editing ? 'Save Changes' : 'Save Private Exam'}
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
