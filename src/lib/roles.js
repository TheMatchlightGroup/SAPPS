// =========================================================
// Access tiers — the single place that says who can do what.
//
//   Tier 1  examiner       Calendar read-only. Completes their own
//                          exams once; after that the amounts are
//                          locked to them.
//   Tier 2  team_lead      Everything a Tier 1 can do, plus: opens
//                          ANY exam's completion modal and adjusts
//                          it — including the Exam Amount.
//   Tier 3  payroll_admin  Full read/write (Today, Payroll, Invoicing,
//                          booking, deleting). 'office' is a legacy
//                          role treated the same for scheduling.
//
// RLS in the database mirrors this; the UI checks here are for
// showing the right controls, not the security boundary.
// =========================================================

export const ROLE_LABEL = {
  examiner: 'Examiner',
  team_lead: 'Team Lead',
  payroll_admin: 'Payroll Admin',
  office: 'Office',
}

/** Tier 3 — Today / Payroll / Invoicing. */
export const isAdmin = (role) => role === 'payroll_admin'

/** Scheduling: book, edit bookings, delete. */
export const isOffice = (role) => role === 'payroll_admin' || role === 'office'

/** Tier 2+ — may adjust any completed exam, including its Exam Amount. */
// ('office' is left out on purpose: RLS doesn't give it intake writes.)
export const canAdjustCompletion = (role) =>
  role === 'team_lead' || role === 'payroll_admin'

/** Roles whose week panel is locked to their own exams. */
export const isSelfScoped = (role) => role === 'examiner' || role === 'team_lead'
