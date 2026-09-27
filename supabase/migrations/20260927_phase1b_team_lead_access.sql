-- =====================================================================
-- SAPPS Phase 1b — Team Lead (Tier 2) access (9/27/2026)
--
-- Tier 1 examiner       sees + completes own exams (unchanged)
-- Tier 2 team_lead      sees ALL exams and can adjust ANY exam's
--                       completion (exam type, status, amounts)
-- Tier 3 payroll_admin  full read/write (unchanged)
--
-- Team leads get NO booking insert/delete, no invoices/org_pos/
-- invoice_details, and week_submissions + reports stay scoped to
-- their own exams. Each policy is recreated with its live name and
-- the team_lead clause added; everything else is verbatim.
-- =====================================================================

-- exams: read all, update (completion) any
drop policy if exists exams_select on public.exams;
create policy exams_select on public.exams
  for select to authenticated
  using (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role, 'team_lead'::user_role])
    or examiner_id = auth.uid()
  );

drop policy if exists exams_update on public.exams;
create policy exams_update on public.exams
  for update to authenticated
  using (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role, 'team_lead'::user_role])
    or examiner_id = auth.uid()
  )
  with check (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role, 'team_lead'::user_role])
    or examiner_id = auth.uid()
  );

-- intake_forms: read / insert / update any exam's financials
drop policy if exists intake_select on public.intake_forms;
create policy intake_select on public.intake_forms
  for select to authenticated
  using (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role, 'team_lead'::user_role])
    or exists (select 1 from public.exams e where e.id = intake_forms.exam_id and e.examiner_id = auth.uid())
  );

drop policy if exists intake_insert on public.intake_forms;
create policy intake_insert on public.intake_forms
  for insert to authenticated
  with check (
    current_user_role() = any (array['payroll_admin'::user_role, 'team_lead'::user_role])
    or exists (select 1 from public.exams e where e.id = intake_forms.exam_id and e.examiner_id = auth.uid())
  );

drop policy if exists intake_update on public.intake_forms;
create policy intake_update on public.intake_forms
  for update to authenticated
  using (
    current_user_role() = any (array['payroll_admin'::user_role, 'team_lead'::user_role])
    or exists (select 1 from public.exams e where e.id = intake_forms.exam_id and e.examiner_id = auth.uid())
  )
  with check (
    current_user_role() = any (array['payroll_admin'::user_role, 'team_lead'::user_role])
    or exists (select 1 from public.exams e where e.id = intake_forms.exam_id and e.examiner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Role assignment — run AT DEPLOY TIME (after the new frontend is live),
-- not before: the old frontend doesn't know 'team_lead'.
-- Everyone already payroll_admin is Tier 3 and needs no change.
-- ---------------------------------------------------------------------
-- update public.users set role = 'team_lead'
--   where email = 'bdhhwt@gmail.com';   -- Brad Hughes (stays is_examiner = true)
