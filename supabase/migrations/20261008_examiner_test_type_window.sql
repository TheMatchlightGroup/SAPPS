-- =====================================================================
-- SAPPS — Examiners may correct their own TEST TYPE after completing (10/8/2026)
--
-- Before: a Tier 1 examiner set the test type once, at completion, and
-- it locked with the amounts. Examiners switch Maintenance ↔ Monitoring
-- or Sexual History ↔ Instant Offense mid-exam, which meant a call to
-- the office every time.
--
-- Now a Tier 1 examiner may change ONLY exam_type on their own completed
-- exam, while all of these hold:
--   • the week containing the exam has NOT been submitted to payroll
--   • the exam's report is NOT marked final
--   • neither the old nor the new type is a No Show (No Shows change what
--     gets billed — those stay with the office / team lead)
-- Amounts stay locked exactly as before (intake_forms guard unchanged).
-- Team leads and the office are unchanged (they can change anything).
-- Function replaced in place; no rows are modified.
-- =====================================================================

create or replace function public.guard_exam_updates()
returns trigger language plpgsql set search_path = public as $$
declare
  r user_role;
  wk date;
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
    -- The one thing an examiner may still change: the test type.
    if new.status is distinct from old.status
       or new.exam_type is not distinct from old.exam_type then
      raise exception 'This exam is already completed. Ask a team lead or the office to change it.'
        using errcode = '42501';
    end if;

    if new.exam_type is null then
      raise exception 'Choose a test type.' using errcode = '42501';
    end if;

    if old.exam_type in ('Probation No Show', 'Pre-Employment No Show')
       or new.exam_type in ('Probation No Show', 'Pre-Employment No Show') then
      raise exception 'Switching to or from a No Show changes the billing — ask a team lead or the office.'
        using errcode = '42501';
    end if;

    wk := date_trunc('week', old.exam_date)::date;  -- Monday, same as the app
    if exists (select 1 from week_submissions ws
                where ws.examiner_id = old.examiner_id and ws.week_start = wk) then
      raise exception 'This week was already submitted to payroll — ask a team lead or the office to change the test type.'
        using errcode = '42501';
    end if;

    if exists (select 1 from reports rp where rp.exam_id = old.id and rp.status = 'final') then
      raise exception 'The report for this exam is marked final — ask a team lead or the office to change the test type.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Keep the report library's copy of the test type in step with the exam.
create or replace function public.sync_report_exam_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.exam_type is distinct from old.exam_type then
    update reports set exam_type = new.exam_type where exam_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_report_exam_type on public.exams;
create trigger trg_sync_report_exam_type
  after update of exam_type on public.exams
  for each row execute function public.sync_report_exam_type();
