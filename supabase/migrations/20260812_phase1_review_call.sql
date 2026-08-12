-- =====================================================================
-- SAPPS Phase 1 — changes from the 8/8/2026 app review call
-- Apply in the Supabase SQL editor (or via MCP) BEFORE deploying the
-- matching frontend build. Each section is independent and idempotent
-- where possible.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. is_examiner flag
--    Role no longer doubles as "appears in examiner lists." Cris becomes
--    payroll_admin but still runs her own exams, so examiner rosters,
--    payroll cards, and month-close all key on this flag instead of role.
-- ---------------------------------------------------------------------
alter table public.users
  add column if not exists is_examiner boolean not null default false;

update public.users set is_examiner = true where role = 'examiner';

-- ---------------------------------------------------------------------
-- 2. exam_type is now chosen at completion, not booking
--    (POs decide the test type right before the exam — schedulers often
--    only have a name.) Bookings insert NULL; completion fills it in.
-- ---------------------------------------------------------------------
alter table public.exams alter column exam_type drop not null;
alter table public.exams alter column exam_type drop default;

-- ---------------------------------------------------------------------
-- 3. Per-organization PO numbers for invoices
--    VCBR, Prince William ADC, and the sex-offender unit now require a
--    PO on the invoice. Saved once per org; blank/absent = no PO line.
-- ---------------------------------------------------------------------
create table if not exists public.org_pos (
  organization text primary key,
  po_number    text not null,
  updated_at   timestamptz not null default now(),
  updated_by   text
);

alter table public.org_pos enable row level security;

-- Invoicing is payroll_admin territory, same as the invoices table.
drop policy if exists org_pos_admin_all on public.org_pos;
create policy org_pos_admin_all on public.org_pos
  for all to authenticated
  using (
    exists (select 1 from public.users u
            where u.id = auth.uid() and u.role = 'payroll_admin')
  )
  with check (
    exists (select 1 from public.users u
            where u.id = auth.uid() and u.role = 'payroll_admin')
  );

-- ---------------------------------------------------------------------
-- 4. Examiners lose booking-insert (and edit/delete) rights on exams
--    Scheduling is office-only now; examiners are read-only on the
--    calendar. Their only writes are intake_forms (completion financials)
--    and the status/exam_type update on their own exam at completion.
--
--    !! POLICY NAMES BELOW ARE PLACEHOLDERS — verify the live policy
--    !! names on public.exams before running this section:
--    !!   select policyname, cmd from pg_policies
--    !!   where schemaname='public' and tablename='exams';
-- ---------------------------------------------------------------------
-- Example shape (adjust names to match live):
--
-- drop policy if exists exams_insert on public.exams;
-- create policy exams_insert on public.exams
--   for insert to authenticated
--   with check (
--     exists (select 1 from public.users u
--             where u.id = auth.uid() and u.role in ('payroll_admin','office'))
--   );
--
-- drop policy if exists exams_update on public.exams;
-- create policy exams_update_office on public.exams
--   for update to authenticated
--   using (
--     exists (select 1 from public.users u
--             where u.id = auth.uid() and u.role in ('payroll_admin','office'))
--   );
-- -- Examiners may still complete their OWN exams (status + exam_type only
-- -- is not expressible in RLS; row-scope to self is the practical gate):
-- create policy exams_update_own_completion on public.exams
--   for update to authenticated
--   using (examiner_id = auth.uid());
--
-- drop policy if exists exams_delete on public.exams;
-- create policy exams_delete on public.exams
--   for delete to authenticated
--   using (
--     exists (select 1 from public.users u
--             where u.id = auth.uid() and u.role = 'payroll_admin')
--   );

-- ---------------------------------------------------------------------
-- 5. Beta-prep role changes (run by hand once emails are confirmed)
-- ---------------------------------------------------------------------
-- Cris: admin who still examines.
-- update public.users
--   set role = 'payroll_admin', is_examiner = true
--   where email = 'crissmithpolygraph@gmail.com';
--
-- Ren: scheduler/admin (confirm email before running).
-- update public.users
--   set role = 'payroll_admin', is_examiner = false
--   where email = '<REN_EMAIL_HERE>';
--
-- Lock other examiners out for the August beta:
-- update public.users
--   set active = false
--   where is_examiner = true
--     and email not in ('crissmithpolygraph@gmail.com');

-- ---------------------------------------------------------------------
-- 6. Test-data wipe for beta (DESTRUCTIVE — run only when ready)
-- ---------------------------------------------------------------------
-- delete from public.intake_forms;
-- delete from public.week_submissions;
-- delete from public.invoices;
-- delete from public.exams;
