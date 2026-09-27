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

/**
 * Read-side fix-up for ONE legacy pattern (nothing in the database is
 * changed): before Exam Amount existed, a Pre-Employment No Show put its
 * $100 bill in amount_due_sapps ("Office Use") so the invoice would read
 * $100. Under today's model Office Use is the examiner's rent, so read
 * that row as Exam Amount $100 / Office Use $0 — otherwise it would show
 * the examiner −$100 net pay. Rows with an exam_amount are untouched.
 */
export function normalizeIntake(f, examType) {
  if (!f || hasExamAmount(f)) return f
  if (examType === 'Pre-Employment No Show') {
    return { ...f, exam_amount: (Number(f.amount_due_examiner) || 0) + (Number(f.amount_due_sapps) || 0), amount_due_sapps: 0 }
  }
  return f
}

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
 * has no exam_amount yet: the legacy amount it already bills when
 * that's above $0 (so opening and saving doesn't change the invoice),
 * the no-show amount for no-show types, otherwise the $225 default.
 * Only Tier 2+ can open a completed exam for editing, and they see
 * this value in the field before saving.
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
