import { parseISO, format, startOfWeek, endOfWeek } from 'date-fns'

// =========================================================
// Month-close logic — the single source of truth for
// "is this examiner's month finished?"
//
// An examiner is ALL IN for a month when:
//   1. Every past-dated exam of theirs in the month is completed
//      (amounts entered), AND
//   2. Every finished week containing one of their month exams
//      has been submitted to payroll.
//
// Future-dated exams and the still-in-progress current week
// never count against anyone — so the dashboard can actually
// reach the green light.
// =========================================================

const iso = (d) => format(d, 'yyyy-MM-dd')

export const weekStartOf = (dateStr) =>
  iso(startOfWeek(parseISO(dateStr), { weekStartsOn: 1 }))

export const weekEndOf = (weekStartISO) =>
  iso(endOfWeek(parseISO(weekStartISO), { weekStartsOn: 1 }))

export const weekRangeLabel = (weekStartISO) => {
  const s = parseISO(weekStartISO)
  return `${format(s, 'MMM d')} – ${format(endOfWeek(s, { weekStartsOn: 1 }), 'MMM d')}`
}

export const monthLabelOf = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return format(new Date(y, m - 1, 1), 'MMMM yyyy')
}

/**
 * @param exams       all exams (any status) — id, client_name, exam_date, status, examiner_id
 * @param submissions week_submissions rows — examiner_id, week_start
 * @param examiners   active examiner users — id, name, email
 * @param month       'YYYY-MM'
 * @param todayISO    'YYYY-MM-DD' (injectable for testing)
 */
export function computeMonthClose({ exams, submissions, examiners, month, todayISO }) {
  const today = todayISO || iso(new Date())

  const submittedSet = new Set(
    (submissions || []).map((s) => `${s.examiner_id}__${s.week_start}`)
  )

  const rows = (examiners || []).map((ex) => {
    const monthExams = (exams || []).filter(
      (e) => e.examiner_id === ex.id && (e.exam_date || '').startsWith(month)
    )

    const dueExams = monthExams.filter((e) => e.exam_date <= today)
    const upcoming = monthExams.filter((e) => e.exam_date > today)
    const incompleteExams = dueExams
      .filter((e) => e.status !== 'completed')
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date))

    // Weeks this examiner worked in the month (keyed by Monday start).
    const weekKeys = [...new Set(monthExams.map((e) => weekStartOf(e.exam_date)))].sort()

    const outstandingWeeks = [] // finished, unsubmitted → owed
    const inProgressWeeks = []  // week hasn't ended yet → not owed
    let weeksSubmitted = 0

    for (const wk of weekKeys) {
      if (submittedSet.has(`${ex.id}__${wk}`)) {
        weeksSubmitted += 1
      } else if (weekEndOf(wk) < today) {
        outstandingWeeks.push(wk)
      } else {
        inProgressWeeks.push(wk)
      }
    }

    const hadWork = monthExams.length > 0
    const allIn = hadWork && incompleteExams.length === 0 && outstandingWeeks.length === 0

    return {
      id: ex.id,
      name: ex.name,
      email: ex.email || null,
      hadWork,
      allIn,
      totalExams: monthExams.length,
      dueCount: dueExams.length,
      completedDue: dueExams.length - incompleteExams.length,
      upcomingCount: upcoming.length,
      incompleteExams,
      weeksWorked: weekKeys.length,
      weeksSubmitted,
      outstandingWeeks,
      inProgressWeeks,
    }
  })

  const active = rows.filter((r) => r.hadWork)
  const outstanding = active.filter((r) => !r.allIn)

  return {
    rows: active,
    outstanding,
    allIn: active.length > 0 && outstanding.length === 0,
    hasWork: active.length > 0,
  }
}

/**
 * Pre-written reminder email for one examiner — opens in the
 * payroll user's own mail app via mailto. Plain, friendly,
 * and lists exactly what's missing so the examiner doesn't
 * have to hunt.
 */
export function buildReminderMailto(row, monthYM) {
  const monthLabel = monthLabelOf(monthYM)
  const first = (row.name || '').split(' ')[0] || 'there'

  const parts = [`Hi ${first},`, '', `Quick reminder for ${monthLabel} payroll:`, '']

  if (row.incompleteExams.length > 0) {
    parts.push('These exams still need their amounts entered in the SAPPS app:')
    for (const e of row.incompleteExams) {
      parts.push(`  • ${format(parseISO(e.exam_date), 'MMM d')} — ${e.client_name}`)
    }
    parts.push('')
  }

  if (row.outstandingWeeks.length > 0) {
    parts.push('And these weeks are ready to submit (open the calendar and tap "Submit this week"):')
    for (const wk of row.outstandingWeeks) {
      parts.push(`  • Week of ${weekRangeLabel(wk)}`)
    }
    parts.push('')
  }

  parts.push(`Once those are in, ${monthLabel} payroll can be finalized. Thank you!`)

  const subject = `SAPPS payroll — ${monthLabel} items outstanding`
  const body = parts.join('\n')
  return `mailto:${row.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
