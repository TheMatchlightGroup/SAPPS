import { useState, useMemo } from 'react'
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import WeekCompleteModal from './WeekCompleteModal'
import '../styles/week-summary.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const iso = (d) => format(d, 'yyyy-MM-dd')
const weekStartOf = (dateStr) => iso(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }))
const rangeLabel = (startISO) => {
  const s = parseISO(startISO)
  return `${format(s, 'MMM d')} – ${format(endOfWeek(s, { weekStartsOn: 1 }), 'MMM d')}`
}

export default function WeekSummaryPanel({ exams, examiners, intakeByExam, weekSubmissions, submitWeek }) {
  const { user, role } = useAuth()
  const isExaminer = role === 'examiner'

  const [weekCursor, setWeekCursor] = useState(new Date())
  // Examiners are locked to themselves; admin/office pick whose week to view.
  const [pickedExaminer, setPickedExaminer] = useState('')
  const examinerId = isExaminer ? user?.id : pickedExaminer

  const weekStart = useMemo(() => startOfWeek(weekCursor, { weekStartsOn: 1 }), [weekCursor])
  const weekEnd = useMemo(() => endOfWeek(weekCursor, { weekStartsOn: 1 }), [weekCursor])
  const wStartISO = iso(weekStart)
  const wEndISO = iso(weekEnd)

  const summary = useMemo(() => {
    if (!examinerId) return null
    const weekExams = exams.filter(
      (e) => e.examiner_id === examinerId && e.exam_date >= wStartISO && e.exam_date <= wEndISO
    )
    let copay = 0, commission = 0, office = 0
    for (const e of weekExams) {
      const f = intakeByExam[e.id]
      if (f) {
        copay += Number(f.copay_amount) || 0
        commission += Number(f.amount_due_examiner) || 0
        office += Number(f.amount_due_sapps) || 0
      }
    }
    const total = weekExams.length
    const completed = weekExams.filter((e) => e.status === 'completed').length
    return {
      weekExams, total, completed,
      copay, commission, office, revenue: copay + commission + office,
    }
  }, [examinerId, exams, intakeByExam, wStartISO, wEndISO])

  // Status of every week this examiner has exams in — used to point them to a
  // week that's finished and waiting to be submitted (the panel opens on the
  // current week, which is often empty).
  const submittedSet = useMemo(() => {
    const s = new Set()
    for (const ws of weekSubmissions) if (ws.examiner_id === examinerId) s.add(ws.week_start)
    return s
  }, [weekSubmissions, examinerId])

  const readyWeeks = useMemo(() => {
    if (!examinerId) return []
    const m = {}
    for (const e of exams) {
      if (e.examiner_id !== examinerId) continue
      const k = weekStartOf(e.exam_date)
      const w = (m[k] ||= { total: 0, completed: 0 })
      w.total += 1
      if (e.status === 'completed') w.completed += 1
    }
    return Object.entries(m)
      .filter(([k, w]) => w.total > 0 && w.completed === w.total && !submittedSet.has(k))
      .map(([k]) => k)
      .sort((a, b) => b.localeCompare(a))
  }, [exams, examinerId, submittedSet])

  // A finished, unsubmitted week other than the one being viewed.
  const nudgeWeek = readyWeeks.find((k) => k !== wStartISO) || null

  const existing = weekSubmissions.find(
    (s) => s.examiner_id === examinerId && s.week_start === wStartISO
  )

  const incompleteThisWeek = useMemo(
    () => (summary ? summary.weekExams.filter((e) => e.status !== 'completed') : []),
    [summary]
  )

  const [showConfirm, setShowConfirm] = useState(false)

  const allDone = summary && summary.total > 0 && summary.completed === summary.total
  const canSubmit = Boolean(examinerId) && allDone && !existing

  let buttonLabel = '✓ Submit this week'
  if (!examinerId) buttonLabel = 'Select an examiner'
  else if (existing) buttonLabel = '✓ Submitted'
  else if (!summary || summary.total === 0) buttonLabel = 'No exams this week'
  else if (!allDone) buttonLabel = `Finish ${incompleteThisWeek.length} to submit`

  const examinerLabel = examiners.find((e) => e.id === examinerId)?.name
    || (isExaminer ? 'your' : '—')

  return (
    <section className="week-panel">
      <div className="week-head">
        <div className="week-nav">
          <button className="navbtn sm" onClick={() => setWeekCursor(subWeeks(weekCursor, 1))}>←</button>
          <span className="week-range">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</span>
          <button className="navbtn sm" onClick={() => setWeekCursor(addWeeks(weekCursor, 1))}>→</button>
          <button className="navbtn sm ghost" onClick={() => setWeekCursor(new Date())}>This week</button>
        </div>

        {!isExaminer && (
          <select className="week-examiner" value={pickedExaminer} onChange={(e) => setPickedExaminer(e.target.value)}>
            <option value="">Select examiner…</option>
            {examiners.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
      </div>

      {/* How submitting works */}
      {examinerId && !existing && (
        <p className="week-help">
          Complete each exam on the calendar below (tap it, enter the amounts). When every
          exam in a week is done, submit it here to send it to payroll.
        </p>
      )}

      {/* Point them to a finished week that's waiting to be submitted */}
      {nudgeWeek && (
        <div className="week-nudge">
          <span className="week-nudge-text">
            <strong>Week of {rangeLabel(nudgeWeek)}</strong> is finished and ready to submit.
          </span>
          <button className="week-nudge-btn" onClick={() => setWeekCursor(parseISO(nudgeWeek))}>
            Go to that week →
          </button>
        </div>
      )}

      <div className="week-stats">
        <Stat label="Exams Completed" value={summary ? `${summary.completed} of ${summary.total}` : '—'} />
        <Stat label="Copay Collected" value={`$${money(summary?.copay)}`} />
        <Stat label={isExaminer ? 'Your Commission' : 'Examiner Commission'} value={`$${money(summary?.commission)}`} />
        <Stat label="Office Use" value={`$${money(summary?.office)}`} />
      </div>

      {/* Which exams still need financials this week */}
      {!existing && incompleteThisWeek.length > 0 && (
        <div className="week-incomplete">
          <span className="week-incomplete-label">Still needs amounts before you can submit:</span>
          <span className="week-incomplete-names">
            {incompleteThisWeek.map((e) => e.client_name).join(', ')}
          </span>
        </div>
      )}

      <div className="week-submit-row">
        {existing ? (
          <span className="week-hint done">
            Submitted {format(parseISO(existing.submitted_at), 'MMM d, h:mm a')} · ${money(existing.total_revenue)} total
          </span>
        ) : (
          <span className="week-hint">
            {!examinerId
              ? 'Choose an examiner to view and submit their week.'
              : summary && summary.total === 0
                ? 'No exams assigned to this week. Use ← or the button above to find the right week.'
                : allDone
                  ? 'This week is complete — submit it to payroll.'
                  : 'Finish the exams listed above, then the week can be submitted.'}
          </span>
        )}
        <button
          className={`btn ${canSubmit ? 'btn-primary' : 'btn-disabled'}`}
          disabled={!canSubmit}
          onClick={() => setShowConfirm(true)}
        >
          {buttonLabel}
        </button>
      </div>

      {showConfirm && summary && (
        <WeekCompleteModal
          summary={{
            examiner_id: examinerId,
            examiner_name: examinerLabel,
            week_start: wStartISO,
            week_end: wEndISO,
            rangeLabel: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`,
            examineeNames: summary.weekExams.map((e) => e.client_name),
            total_exams: summary.total,
            completed_exams: summary.completed,
            copay: summary.copay,
            commission: summary.commission,
            office: summary.office,
            total_revenue: summary.revenue,
          }}
          onSubmit={submitWeek}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
