// =========================================================
// Exam money — the single source of truth for the math.
//
//   Exam Amount   what SAPPS charges the entity for the exam
//                 (default $225; Tier 2+ can adjust)
//   Copay         what the examinee paid — SUBTRACTED from the
//                 Exam Amount
//   Billed        Exam Amount − Copay  → the invoice line total
//
//   Commission    amount due to the examiner for the work
//   Office Use    the examiner's "rent" for using the office
//   Examiner net  Commission − Office Use → what payroll pays out
//
// Legacy rows (completed before Exam Amount existed) have
// exam_amount = null. Until someone adjusts them in the modal,
// they bill exactly what they billed before: commission + office.
// =========================================================

export const DEFAULT_EXAM_AMOUNT = 225

const n = (v) => Number(v) || 0

export const hasExamAmount = (f) => f?.exam_amount !== null && f?.exam_amount !== undefined && f?.exam_amount !== ''

/** The Exam Amount for an intake row (legacy fallback for null). */
export const examAmountOf = (f) =>
  !f ? 0 : hasExamAmount(f) ? n(f.exam_amount) : n(f.amount_due_examiner) + n(f.amount_due_sapps)

export const copayOf = (f) => n(f?.copay_amount)

/** What the entity is billed: Exam Amount − Copay. */
export const billedOf = (f) => examAmountOf(f) - copayOf(f)

export const commissionOf = (f) => n(f?.amount_due_examiner)
export const officeUseOf = (f) => n(f?.amount_due_sapps)

/** What the examiner is paid: Commission − Office Use. */
export const examinerNetOf = (f) => commissionOf(f) - officeUseOf(f)

/**
 * Starting value for the modal's Exam Amount field on an exam that
 * has no exam_amount yet: the legacy amount it already bills (so
 * opening and saving never silently changes an invoice), or the
 * $225 default when there's nothing to go on.
 */
export function initialExamAmount(f, typeDefault) {
  if (hasExamAmount(f)) return f.exam_amount
  const legacy = n(f?.amount_due_examiner) + n(f?.amount_due_sapps)
  if (f && legacy > 0) return legacy
  // No-show types carry their own amount ($0 / $100).
  if (typeDefault !== undefined) return typeDefault
  return DEFAULT_EXAM_AMOUNT
}

/** Sum the money columns over a list of intake rows. */
export function sumAmounts(rows) {
  const t = { examAmount: 0, copay: 0, billed: 0, commission: 0, office: 0, net: 0 }
  for (const f of rows) {
    if (!f) continue
    t.examAmount += examAmountOf(f)
    t.copay += copayOf(f)
    t.billed += billedOf(f)
    t.commission += commissionOf(f)
    t.office += officeUseOf(f)
    t.net += examinerNetOf(f)
  }
  return t
}
