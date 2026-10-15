import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { timeRange } from '../lib/privateBlocks'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function WeekCompleteModal({ summary, onSubmit, onClose, resubmit = false }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attested, setAttested] = useState(false)
  const pb = summary.privateBlocks || []
  const needsAttest = Boolean(summary.usesOffice)

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
      total_net: summary.total_net,
      private_office_count: needsAttest ? pb.length : null,
      private_office_total: needsAttest ? (Number(summary.privateFees) || 0) : null,
    })
    setBusy(false)
    if (error) setError(error)
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{resubmit ? 'Re-submit Week to Payroll' : 'Submit Week to Payroll'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <p className="week-final-note">
            You're about to {resubmit ? 're-submit' : 'submit'} <strong>{summary.examiner_name}</strong>'s week of{' '}
            <strong>{summary.rangeLabel}</strong> to payroll.{' '}
            {resubmit ? 'This replaces the totals submitted earlier.' : 'This action is final.'}
          </p>

          <div className="week-totals">
            <div><span>Exams</span><span>{summary.completed_exams} of {summary.total_exams} completed</span></div>
            <div><span>Exam amounts</span><span>${money(summary.examAmount)}</span></div>
            <div><span>Copay collected</span><span>− ${money(summary.copay)}</span></div>
            <div className="week-totals-grand"><span>Billed to clients</span><span>${money(summary.billed)}</span></div>
            <div><span>Examiner commission</span><span>${money(summary.commission)}</span></div>
            <div><span>Office use</span><span>− ${money(summary.office)}</span></div>
            <div className="week-totals-grand"><span>Examiner net pay</span><span>${money(summary.net)}</span></div>
          </div>

          {needsAttest && (
            <div className="pb-attest">
              <div className="pb-attest-title">Private exams at the SAPPS office</div>
              {pb.length === 0 ? (
                <p className="pb-attest-none">None logged for this week.</p>
              ) : (
                <ul>
                  {pb.map((b) => (
                    <li key={b.id}>
                      {format(parseISO(b.block_date), 'EEE, MMM d')} · {timeRange(b.start_time, b.duration_minutes)} — {b.office_fee == null ? 'office fee not set yet' : `office fee $${money(b.office_fee)}`}
                    </li>
                  ))}
                </ul>
              )}
              <label>
                <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                <span>
                  {summary.onBehalf
                    ? (pb.length === 0
                      ? `Confirmed with ${summary.examiner_name}: no private exams at the SAPPS office this week.`
                      : `Confirmed with ${summary.examiner_name}: these are all of their private exams at the SAPPS office this week.`)
                    : pb.length === 0
                      ? 'I did not hold any private exams at the SAPPS office this week.'
                      : `These are all of the private exams I held at the SAPPS office this week ($${money(summary.privateFees)} in office fees).`}
                </span>
              </label>
              <div className="pb-attest-hint">
                Missing one? Close this, add it with “+ Private Exam” on the calendar, then submit.
                Office fees are deducted from pay by payroll, separately from the totals above.
              </div>
            </div>
          )}

          <div className="week-examinees">
            <span className="week-examinees-label">Examinees this week</span>
            <ul>{summary.examineeNames.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        </div>

        <footer className="modal-foot">
          <button className="btn btn-text" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy || (needsAttest && !attested)}
            title={needsAttest && !attested ? 'Confirm your private office exams first' : undefined}>
            {busy ? 'Submitting…' : resubmit ? 'Re-submit Week' : 'Submit Week'}
          </button>
        </footer>
      </div>
    </div>
  )
}
