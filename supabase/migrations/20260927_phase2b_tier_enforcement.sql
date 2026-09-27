-- =====================================================================
-- SAPPS Phase 2b — Enforce the tiers in the database (audit, 9/27/2026)
--
-- Row-level security decides WHICH rows a user can touch but not WHICH
-- COLUMNS. These guards close the gap between what the app shows and
-- what the API would allow:
--
--   Tier 1 examiner   completes an exam ONCE: may insert its financials,
--                     may not update them afterward, may not set a special
--                     Exam Amount, may not edit a completed exam.
--   Tier 2 team_lead  may change completion fields (status, exam_type)
--                     on any exam — never booking details.
--   Tier 1 + 2        may not change booking details (name, date, time,
--                     org, duration, examiner) on any exam.
--   Tier 3 / service  unrestricted (SQL editor has no auth.uid()).
--
-- Also: week_submissions.total_net (Commission − Office Use as submitted)
-- so a commission edited after submit flags the week for re-submit; and
-- intake_forms deletes become admin-only (the app never deletes them —
-- they cascade with the exam — so this only closes a bypass).
-- No existing row is modified.
-- =====================================================================

alter table public.week_submissions add column if not exists total_net numeric;

-- ---- intake_forms guard ---------------------------------------------
create or replace function public.guard_intake_forms()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if current_user_role() = 'examiner'::user_role then
    if tg_op = 'UPDATE' then
      raise exception 'This exam is already completed. Ask a team lead or the office to change it.'
        using errcode = '42501';
    end if;
    -- The only Exam Amounts the app ever gives an examiner: $225 default,
    -- $100 Pre-Employment No Show, $0 Probation No Show.
    if new.exam_amount is not null and new.exam_amount not in (0, 100, 225) then
      raise exception 'Only a team lead or the office can set a special Exam Amount.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_intake_forms on public.intake_forms;
create trigger trg_guard_intake_forms
  before insert or update on public.intake_forms
  for each row execute function public.guard_intake_forms();

-- ---- exams guard -----------------------------------------------------
create or replace function public.guard_exam_updates()
returns trigger language plpgsql set search_path = public as $$
declare r user_role;
begin
  if auth.uid() is null then return new; end if;
  r := current_user_role();
  if r in ('payroll_admin'::user_role, 'office'::user_role) then return new; end if;

  if (new.client_name, new.exam_date, new.exam_time, new.organization,
      new.duration_minutes, new.examiner_id, new.created_by)
     is distinct from
     (old.client_name, old.exam_date, old.exam_time, old.organization,
      old.duration_minutes, old.examiner_id, old.created_by) then
    raise exception 'Only the office can change booking details.' using errcode = '42501';
  end if;

  if r = 'examiner'::user_role and old.status = 'completed' then
    raise exception 'This exam is already completed. Ask a team lead or the office to change it.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_exam_updates on public.exams;
create trigger trg_guard_exam_updates
  before update on public.exams
  for each row execute function public.guard_exam_updates();

-- ---- intake_forms delete: admin only ---------------------------------
drop policy if exists intake_delete on public.intake_forms;
create policy intake_delete on public.intake_forms
  for delete to authenticated
  using (current_user_role() = 'payroll_admin'::user_role);
