import { parseISO, format } from 'date-fns'

// =========================================================
// Report rules — the single source of truth for
// "does this exam's missing report block the week?"
//
// Agencies give examiners FIVE BUSINESS DAYS from the exam
// to deliver the written report. Inside that window, a
// missing report is a reminder; past it, it blocks the
// week from being submitted to payroll.
// =========================================================

export const REPORT_GRACE_BUSINESS_DAYS = 5

const iso = (d) => format(d, 'yyyy-MM-dd')

/** Weekdays (Mon–Fri) strictly after `fromISO`, up to and including `toISO`. */
export function businessDaysSince(fromISO, toISO) {
  const today = toISO || iso(new Date())
  if (!fromISO || fromISO >= today) return 0
  let count = 0
  const d = parseISO(fromISO)
  const end = parseISO(today)
  d.setDate(d.getDate() + 1)
  while (d <= end) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count += 1
    d.setDate(d.getDate() + 1)
  }
  return count
}

/** True when the report clock has run out for this exam date. */
export const reportOverdue = (examDateISO, todayISO) =>
  businessDaysSince(examDateISO, todayISO) > REPORT_GRACE_BUSINESS_DAYS

/** A report row satisfies the requirement when it's final or waived. */
export const reportSatisfied = (report) =>
  report?.status === 'final' || report?.status === 'waived'

export const REPORT_STATUS_LABEL = {
  draft: 'Draft',
  final: 'Final',
  waived: 'No report needed',
}
