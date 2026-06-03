import { useState } from 'react'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function WeekCompleteModal({ summary, onSubmit, onClose }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    setBusy(true)
    const { error } = await onSubmit({
      examiner_id: summary.examiner_id,
      examiner_name: summary.examiner_name,
      week_start: summary.week_start,
      week_end: summary.week_end,
      total_exams: summary.total_exams,
      completed_exams: summary.completed_exams,
      total_revenue: summary.total_revenue,
    })
    setBusy(false)
    if (error) setError(error)
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Submit Week to Payroll</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <p className="week-final-note">
            You're about to submit <strong>{summary.examiner_name}</strong>'s week of{' '}
            <strong>{summary.rangeLabel}</strong> to payroll. This action is final.
          </p>

          <div className="week-totals">
            <div><span>Exams</span><span>{summary.completed_exams} of {summary.total_exams} completed</span></div>
            <div><span>Copay collected</span><span>${money(summary.copay)}</span></div>
            <div><span>Examiner commission</span><span>${money(summary.commission)}</span></div>
            <div><span>Office use</span><span>${money(summary.office)}</span></div>
            <div className="week-totals-grand"><span>Total revenue</span><span>${money(summary.total_revenue)}</span></div>
          </div>

          <div className="week-examinees">
            <span className="week-examinees-label">Examinees this week</span>
            <ul>{summary.examineeNames.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        </div>

        <footer className="modal-foot">
          <button className="btn btn-text" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Week'}
          </button>
        </footer>
      </div>
    </div>
  )
}
