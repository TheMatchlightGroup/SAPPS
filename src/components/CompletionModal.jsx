import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { TEST_TYPE_ABBR } from '../lib/constants'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CompletionModal({ exam, examinerName, fetchIntake, onComplete, onDelete, onClose }) {
  const [fin, setFin] = useState({ copay_amount: '', amount_due_examiner: '', amount_due_sapps: '' })
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
    if (fin.copay_amount === '' || fin.amount_due_examiner === '' || fin.amount_due_sapps === '') {
      return setError('Fill in all three amounts (enter 0 if not applicable).')
    }
    setBusy(true)
    const { error } = await onComplete(exam, fin)
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
              <span>Test type</span><span>{exam.exam_type} ({TEST_TYPE_ABBR[exam.exam_type] || '—'})</span>
              <span>Examiner</span><span>{examinerName(exam.examiner_id)}</span>
            </div>
            {exam.status === 'completed' && <div className="summary-flag">Already completed — editing financials</div>}
          </div>

          {loadingIntake ? (
            <div className="cal-empty" style={{ padding: 'var(--s-5)' }}>Loading…</div>
          ) : (
            <>
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
              <button className="btn btn-danger-text" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</button>
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
