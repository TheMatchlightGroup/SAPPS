import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { TEST_TYPES } from '../lib/constants'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Completion modal — where the examiner records what actually happened.
// Test type lives HERE now, not on the booking: for probation exams the
// type isn't known until the PO talks to the examinee right before the
// test (decided on the 8/8 review call). Copay was already here.
//
// `canEditBooking` / `onEditBooking`: office roles get a button to jump to
// the booking editor (reshuffle times, fix names). `canDelete`: office only —
// examiners are read-only on the schedule and can't remove bookings.
export default function CompletionModal({
  exam, examinerName, fetchIntake, onComplete, onDelete, onClose,
  canDelete = false, canEditBooking = false, onEditBooking,
}) {
  const [fin, setFin] = useState({ copay_amount: '', amount_due_examiner: '', amount_due_sapps: '' })
  const [examType, setExamType] = useState(exam.exam_type || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadingIntake, setLoadingIntake] = useState(true)

  // Prefill from any existing financials (so re-opening a completed exam edits).
  useEffect(() => {
    let active = true
    fetchIntake(exam.id).then(({ data }) => {
      if (!active) return
      if (data) {
        setFin({
          copay_amount: data.copay_amount ?? '',
          amount_due_examiner: data.amount_due_examiner ?? '',
          amount_due_sapps: data.amount_due_sapps ?? '',
        })
      }
      setLoadingIntake(false)
    })
    return () => { active = false }
  }, [exam.id, fetchIntake])

  const set = (key) => (e) => setFin((f) => ({ ...f, [key]: e.target.value }))
  const total = (Number(fin.copay_amount) || 0) + (Number(fin.amount_due_examiner) || 0) + (Number(fin.amount_due_sapps) || 0)

  async function handleSave() {
    setError('')
    if (!examType) {
      return setError('Select the test type — it goes on the invoice.')
    }
    if (fin.copay_amount === '' || fin.amount_due_examiner === '' || fin.amount_due_sapps === '') {
      return setError('Fill in all three amounts (enter 0 if not applicable).')
    }
    setBusy(true)
    const { error } = await onComplete(exam, { ...fin, exam_type: examType })
    setBusy(false)
    if (error) setError(error)
    else onClose()
  }

  async function handleDelete() {
    setBusy(true)
    const { error } = await onDelete(exam.id)
    setBusy(false)
    if (error) { setError(error); setConfirmDelete(false) }
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Complete Exam</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          {/* Read-only exam summary */}
          <div className="exam-summary">
            <div className="summary-name">{exam.client_name}</div>
            <div className="summary-grid">
              <span>Date</span><span>{format(parseISO(exam.exam_date), 'EEE, MMM d')} · {exam.exam_time?.slice(0, 5)}</span>
              <span>Organization</span><span>{exam.organization}</span>
              <span>Examiner</span><span>{examinerName(exam.examiner_id)}</span>
            </div>
            {canEditBooking && (
              <button
                className="btn btn-text summary-edit"
                onClick={() => onEditBooking?.(exam)}
                type="button"
              >
                ✎ Edit booking details
              </button>
            )}
            {exam.status === 'completed' && <div className="summary-flag">Already completed — editing details</div>}
          </div>

          {loadingIntake ? (
            <div className="cal-empty" style={{ padding: 'var(--s-5)' }}>Loading…</div>
          ) : (
            <>
              <div className="field">
                <label>Test type</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)}>
                  <option value="" disabled>Select…</option>
                  {TEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.value} ({t.abbr})</option>
                  ))}
                </select>
                <span className="field-hint" style={{ color: 'var(--ink-700)', opacity: 0.6 }}>
                  Chosen at completion — the PO usually decides this right before the exam.
                </span>
              </div>

              <CurrencyField label="CoPay" hint="Paid by examinee" value={fin.copay_amount} onChange={set('copay_amount')} />
              <CurrencyField label="Amount Due to Examiner" hint="Commission paid to examiner" value={fin.amount_due_examiner} onChange={set('amount_due_examiner')} />
              <CurrencyField label="SAPPS Office Use" hint="Facility / rental fee retained by SAPPS" value={fin.amount_due_sapps} onChange={set('amount_due_sapps')} />
              <div className="total-row"><span>Total</span><span>${money(total)}</span></div>
            </>
          )}
        </div>

        <footer className="modal-foot completion-foot">
          {confirmDelete ? (
            <div className="confirm-delete">
              <span>Delete this booking? This can't be undone.</span>
              <button className="btn btn-text" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          ) : (
            <>
              {canDelete ? (
                <button className="btn btn-danger-text" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</button>
              ) : <span />}
              <div className="foot-right">
                <button className="btn btn-text" onClick={onClose} disabled={busy}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={busy || loadingIntake}>
                  {busy ? 'Saving…' : 'Complete & Save'}
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function CurrencyField({ label, hint, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="currency-input">
        <span className="currency-prefix">$</span>
        <input type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={onChange} />
      </div>
      {hint && <span className="field-hint" style={{ color: 'var(--ink-700)', opacity: 0.6 }}>{hint}</span>}
    </div>
  )
}
