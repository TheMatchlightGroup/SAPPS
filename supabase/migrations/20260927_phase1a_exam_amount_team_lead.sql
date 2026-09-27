-- =====================================================================
-- SAPPS Phase 1a — Exam Amount + Team Lead tier (9/27/2026)
--
-- ADDITIVE ONLY. No existing row is modified.
--
-- 1. intake_forms.exam_amount — what SAPPS charges the entity for the
--    exam. Invoice line: Exam Amount − Copay. NULLABLE with NO DEFAULT on
--    purpose: rows completed before today stay NULL, and the app keeps
--    billing them exactly as before (commission + office use) until
--    someone adjusts them in the completion modal. New completions write
--    it explicitly ($225 default, $0 / $100 for the no-show types).
--
-- 2. 'team_lead' role (Tier 2). Must be its own migration: a new enum
--    value can't be referenced in the same transaction that adds it.
-- =====================================================================

alter table public.intake_forms
  add column if not exists exam_amount numeric
  check (exam_amount is null or exam_amount >= 0);

comment on column public.intake_forms.exam_amount is
  'Amount SAPPS charges the entity for the exam. Billed = exam_amount - copay_amount. NULL = legacy row (billed as amount_due_examiner + amount_due_sapps).';

alter type public.user_role add value if not exists 'team_lead';
