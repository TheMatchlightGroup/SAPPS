-- =====================================================================
-- SAPPS Phase 2 — Reports module (8/8/2026 call, greenlit by Rob)
-- Templates + reports tables, library-open reads, scoped writes.
-- Template content is seeded separately (data, not schema).
-- =====================================================================

create type report_status as enum ('draft', 'final', 'waived');

-- Report templates: ordered sections of boilerplate keyed to test types.
-- Template edits are an admin/database-side operation ("send me the new
-- template and I'll add the rows" — maintenance covers it).
create table public.report_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  test_types    text[] not null default '{}',
  header_fields jsonb not null default '[]',
  sections      jsonb not null default '[]',
  results       jsonb not null default '[]',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Reports: one per exam. Exam fields are denormalized so the library
-- keeps working even if a calendar booking is later deleted.
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid unique references public.exams(id) on delete set null,
  template_id   uuid references public.report_templates(id),
  examiner_id   uuid,
  examiner_name text,
  client_name   text,
  organization  text,
  exam_date     date,
  exam_type     text,
  header        jsonb not null default '{}',
  sections      jsonb not null default '[]',
  result        text,
  status        report_status not null default 'draft',
  waive_reason  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    text,
  finalized_at  timestamptz
);

create index reports_client_name_idx on public.reports (lower(client_name));
create index reports_exam_date_idx on public.reports (exam_date);
create index reports_organization_idx on public.reports (organization);

alter table public.report_templates enable row level security;
alter table public.reports enable row level security;

-- Templates: everyone reads (the editor needs them); admins write.
create policy report_templates_select on public.report_templates
  for select to authenticated using (true);
create policy report_templates_write on public.report_templates
  for all to authenticated
  using (current_user_role() = 'payroll_admin'::user_role)
  with check (current_user_role() = 'payroll_admin'::user_role);

-- Reports: the LIBRARY IS OPEN — any examiner can search and read any
-- report (decided on the call: no more interrupting Cris mid-exam).
create policy reports_select on public.reports
  for select to authenticated using (true);

-- Writes: office roles, or the examiner who owns the exam.
create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role])
    or examiner_id = auth.uid()
  );
create policy reports_update on public.reports
  for update to authenticated
  using (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role])
    or examiner_id = auth.uid()
  )
  with check (
    current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role])
    or examiner_id = auth.uid()
  );

-- Delete: waived placeholders can be removed by their owner (the unwaive
-- flow); anything else is admin territory.
create policy reports_delete on public.reports
  for delete to authenticated
  using (
    current_user_role() = 'payroll_admin'::user_role
    or (examiner_id = auth.uid() and status = 'waived'::report_status)
  );
