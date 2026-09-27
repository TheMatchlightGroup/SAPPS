import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { TEST_TYPES, TEST_TYPE_BILLING_DEFAULTS, NO_REPORT_TYPES } from '../lib/constants'
import { REPORT_STATUS_LABEL } from '../lib/reportUtils'
import { DEFAULT_EXAM_AMOUNT, initialExamAmount } from '../lib/amounts'
import { canAdjustCompletion, isOffice } from '../lib/roles'
import { useAuth } from '../context/AuthContext'
import '../styles/modal.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Completion modal — where the examiner records what actually happened.
// Test type lives HERE now, not on the booking: for probation exams the
// type isn't known until the PO talks to the examinee right before the
// test (decided on the 8/8 review call). Copay was already here.
//
// Money model (see lib/amounts.js): Exam Amount − Copay is what the entity
// is billed; Commission − Office Use is what the examiner is paid.
//
// Tiers (see lib/roles.js):
//   Tier 1 examiner  — completes their own exam once. Exam Amount is shown
//                      but fixed at the default; after completion the whole
//                      form is read-only to them.
//   Tier 2 team lead — can adjust any exam here, including Exam Amount.
//   Tier 3 admin     — same, plus booking edits and delete.
//
// `canEditBooking` / `onEditBooking`: office roles get a button to jump to
// the booking editor (reshuffle times, fix names). `canDelete`: office only —
// examiners are read-only on the schedule and can't remove bookings.
export default function CompletionModal({
  exam, examinerName, fetchIntake, onComplete, onDelete, onClose,
  canDelete = false, canEditBooking = false, onEditBooking,
  report = null, onWaiveReport, onUnwaiveReport,
}) {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const canAdjust = canAdjustCompletion(role)
  // Tier 1 gets one pass at the form; once completed, it's theirs to view only.
  const locked = !canAdjust && exam.status === 'completed'
  const canEditExamAmount = canAdjust
  // Reports stay with the exam's own examiner (or the office) — a team lead
  // adjusting someone else's amounts shouldn't end up signing their report.
  const canWriteReport = isOffice(role) || (user?.id && exam.examiner_id === user.id)

  const [fin, setFin] = useState({ exam_amount: '', copay_amount: '', amount_due_examiner: '', amount_due_sapps: '' })
  const [examType, setExamType] = useState(exam.exam_type || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busyWaive, setBusyWaive] = useState(false)
  const [loadingIntake, setLoadingIntake] = useState(true)

  // Prefill from any existing financials (so re-opening a completed exam edits).
  useEffect(() => {
    let active = true
    fetchIntake(exam.id).then(({ data }) => {
      if (!active) return
      const typeDefault = TEST_TYPE_BILLING_DEFAULTS[exam.exam_type]?.exam_amount
      if (data) {
        setFin({
          exam_amount: initialExamAmount(data, typeDefault),
          copay_amount: data.copay_amount ?? '',
          amount_due_examiner: data.amount_due_examiner ?? '',
          amount_due_sapps: data.amount_due_sapps ?? '',
        })
      } else {
        setFin((f) => ({ ...f, exam_amount: typeDefault ?? String(DEFAULT_EXAM_AMOUNT) }))
      }
      setLoadingIntake(false)
    })
    return () => { active = false }
    // fetchIntake is stable (useCallback in useCalendarData); keyed on the exam
    // only so a calendar re-render never wipes what's being typed.
  }, [exam.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setFin((f) => ({ ...f, [key]: e.target.value }))
  const num = (v) => Number(v) || 0
  const billed = num(fin.exam_amount) - num(fin.copay_amount)
  const examinerPay = num(fin.amount_due_examiner) - num(fin.amount_due_sapps)

  function changeType(t) {
    const prevDefaults = TEST_TYPE_BILLING_DEFAULTS[examType]
    setExamType(t)
    if (TEST_TYPE_BILLING_DEFAULTS[t]) {
      // No-show types auto-fill their amounts (still adjustable by Tier 2+).
      setFin({ ...TEST_TYPE_BILLING_DEFAULTS[t] })
    } else if (prevDefaults) {
      // Switching OFF a no-show: put the Exam Amount back to the default.
      setFin((f) => ({ ...f, exam_amount: String(DEFAULT_EXAM_AMOUNT) }))
    }
  }

  async function handleSave() {
    setError('')
    if (!examType) {
      return setError('Select the test type — it goes on the invoice.')
    }
    if (fin.exam_amount === '' || fin.copay_amount === '' || fin.amount_due_examiner === '' || fin.amount_due_sapps === '') {
      return setError('Fill in every amount (enter 0 if not applicable).')
    }
    if (num(fin.copay_amount) > num(fin.exam_amount)) {
      return setError(`Copay ($${money(fin.copay_amount)}) can't be more than the Exam Amount ($${money(fin.exam_amount)}) — the invoice would go negative.`)
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
          <h3>{locked ? 'Exam Details' : exam.status === 'completed' ? 'Adjust Exam' : 'Complete Exam'}</h3>
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
            {exam.status === 'completed' && (
              <div className="summary-flag">{locked ? '✓ Completed' : 'Already completed — editing details'}</div>
            )}
          </div>

          {loadingIntake ? (
            <div className="cal-empty" style={{ padding: 'var(--s-5)' }}>Loading…</div>
          ) : (
            <>
              {locked && (
                <p className="lock-note">
                  This exam is completed. To change anything below, ask a team lead or the office.
                </p>
              )}

              <div className="field">
                <label>Test type</label>
                <select
                  value={examType}
                  onChange={(e) => changeType(e.target.value)}
                  disabled={locked}
                >
                  <option value="" disabled>Select…</option>
                  {TEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.value} ({t.abbr})</option>
                  ))}
                </select>
                {!locked && (
                  <span className="field-hint" style={{ color: 'var(--ink-700)', opacity: 0.6 }}>
                    Chosen at completion — the PO usually decides this right before the exam.
                  </span>
                )}
              </div>

              <CurrencyField
                label="Exam Amount"
                hint={canEditExamAmount
                  ? `What SAPPS charges ${exam.organization || 'the client'} for this exam — $${DEFAULT_EXAM_AMOUNT} unless it's a special case`
                  : 'What SAPPS charges the client — set by the office'}
                value={fin.exam_amount}
                onChange={set('exam_amount')}
                readOnly={!canEditExamAmount || locked}
              />
              <CurrencyField label="CoPay" hint="Paid by the examinee — subtracted from the Exam Amount" value={fin.copay_amount} onChange={set('copay_amount')} readOnly={locked} />

              <div className="total-row">
                <span>Billed to client</span>
                <span className={billed < 0 ? 'neg' : ''}>${money(billed)}</span>
              </div>
              <div className="total-sub">Exam Amount − CoPay</div>

              <div className="fin-divider"><span>Examiner pay</span></div>

              <CurrencyField label="Amount Due to Examiner" hint="Commission for the exam" value={fin.amount_due_examiner} onChange={set('amount_due_examiner')} readOnly={locked} />
              <CurrencyField label="Office Use" hint="Examiner's office rent — subtracted from the commission" value={fin.amount_due_sapps} onChange={set('amount_due_sapps')} readOnly={locked} />

              <div className="total-row small">
                <span>Examiner net pay</span>
                <span className={examinerPay < 0 ? 'neg' : ''}>${money(examinerPay)}</span>
              </div>
              <div className="total-sub">Commission − Office Use</div>

              {/* Report — agencies expect the written report within 5 business
                  days. Available once the exam is completed (type is known). */}
              {exam.status === 'completed' && NO_REPORT_TYPES.includes(exam.exam_type) && (
                <div className="report-block">
                  <div className="report-block-head">
                    <span className="report-block-label">Written report</span>
                    <span className="rp-pill waived">Not required</span>
                  </div>
                  <p className="mnote" style={{ fontSize: '0.8rem', opacity: 0.65, margin: 0 }}>
                    No-shows don't require a written report.
                  </p>
                </div>
              )}
              {exam.status === 'completed' && !NO_REPORT_TYPES.includes(exam.exam_type) && (
                <div className="report-block">
                  <div className="report-block-head">
                    <span className="report-block-label">Written report</span>
                    {report && (
                      <span className={`rp-pill ${report.status}`}>
                        {REPORT_STATUS_LABEL[report.status] || report.status}
                      </span>
                    )}
                  </div>
                  {!canWriteReport ? (
                    <p className="mnote" style={{ fontSize: '0.8rem', opacity: 0.65, margin: 0 }}>
                      {report ? 'Written by the exam\u2019s examiner — open it from the Report Library.' : 'Not started yet — the exam\u2019s examiner writes this one.'}
                    </p>
                  ) : report?.status !== 'waived' ? (
                    <>
                      <button
                        className="btn report-open"
                        type="button"
                        onClick={() => { onClose(); navigate(`/reports/exam/${exam.id}`) }}
                      >
                        {report ? 'Open report →' : 'Fill out the report →'}
                      </button>
                      {!report && (
                        <label className="report-waive">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={async () => { setBusyWaive(true); await onWaiveReport?.(exam); setBusyWaive(false) }}
                            disabled={busyWaive}
                          />
                          <span>No report needed — polygraph terminated</span>
                        </label>
                      )}
                    </>
                  ) : (
                    <label className="report-waive">
                      <input
                        type="checkbox"
                        checked
                        onChange={async () => { setBusyWaive(true); await onUnwaiveReport?.(exam); setBusyWaive(false) }}
                        disabled={busyWaive}
                      />
                      <span>No report needed — polygraph terminated</span>
                    </label>
                  )}
                </div>
              )}
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
                {locked ? (
                  <button className="btn btn-primary" onClick={onClose}>Close</button>
                ) : (
                  <>
                    <button className="btn btn-text" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={busy || loadingIntake}>
                      {busy ? 'Saving…' : exam.status === 'completed' ? 'Save Changes' : 'Complete & Save'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function CurrencyField({ label, hint, value, onChange, readOnly = false }) {
  return (
    <div className={`field${readOnly ? ' readonly' : ''}`}>
      <label>{label}{readOnly && <span className="lock-tag" aria-label="read only">🔒</span>}</label>
      <div className="currency-input">
        <span className="currency-prefix">$</span>
        <input type="number" min="0" step="0.01" placeholder="0.00" value={value} onChange={onChange}
          readOnly={readOnly} tabIndex={readOnly ? -1 : undefined} />
      </div>
      {hint && <span className="field-hint" style={{ color: 'var(--ink-700)', opacity: 0.6 }}>{hint}</span>}
    </div>
  )
}
