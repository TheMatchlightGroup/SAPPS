-- =====================================================================
-- SAPPS Phase 3 — Report safety net + agency addresses (9/29/2026)
--
-- 1. report_versions: every meaningful change to a report keeps the
--    PREVIOUS content, and a deleted report is kept whole. Written by a
--    trigger, so no screen can skip it. Snapshots are taken when:
--      • the status changes (draft → final, etc.)
--      • someone clicks Save / Mark final, or restores an older version
--      • a different person saves than the last one
--      • the report is deleted
--      • otherwise at most once every 10 minutes (autosave-friendly)
--    Anyone signed in can read versions (the library is open); nobody can
--    edit or delete them from the app.
--
-- 2. org_addresses: an agency's mailing address, remembered the first time
--    someone types it into a report, so it pre-fills every report after.
-- ADDITIVE ONLY.
-- =====================================================================

-- save_note: the app marks each save 'auto' (autosave), 'manual' (Save /
-- Mark final) or 'restore' (restoring an older version). Manual saves and
-- restores always keep the content they replace.
alter table public.reports add column if not exists save_note text;

create table if not exists public.report_versions (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null,
  exam_id       uuid,
  client_name   text,
  status        report_status,
  examiner_name text,
  header        jsonb,
  sections      jsonb,
  result        text,
  saved_by      text,          -- who wrote THIS content (the old row's updated_by)
  content_at    timestamptz,   -- when this content was saved (the old row's updated_at)
  snapshot_at   timestamptz not null default now(),
  reason        text
);
create index if not exists report_versions_report_idx on public.report_versions (report_id, snapshot_at desc);

alter table public.report_versions enable row level security;
drop policy if exists report_versions_select on public.report_versions;
create policy report_versions_select on public.report_versions
  for select to authenticated using (true);

create or replace function public.snapshot_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare last_snap timestamptz; why text;
begin
  if tg_op = 'DELETE' then
    insert into report_versions (report_id, exam_id, client_name, status, examiner_name, header, sections, result, saved_by, content_at, reason)
    values (old.id, old.exam_id, old.client_name, old.status, old.examiner_name, old.header, old.sections, old.result, old.updated_by, old.updated_at, 'deleted');
    return old;
  end if;

  -- Nothing written changed (e.g. a save with identical text): no snapshot.
  if (old.header, old.sections, old.result, old.status, old.examiner_name)
     is not distinct from (new.header, new.sections, new.result, new.status, new.examiner_name) then
    return new;
  end if;

  select max(snapshot_at) into last_snap from report_versions where report_id = old.id;
  why := case
    when old.status is distinct from new.status then 'before status change'
    when new.save_note = 'restore' then 'before restoring an older version'
    when new.save_note = 'manual' then 'before manual save'
    when coalesce(old.updated_by, '') is distinct from coalesce(new.updated_by, '') then 'before someone else edited'
    when last_snap is null or last_snap < now() - interval '10 minutes' then 'periodic'
    else null end;

  if why is not null then
    insert into report_versions (report_id, exam_id, client_name, status, examiner_name, header, sections, result, saved_by, content_at, reason)
    values (old.id, old.exam_id, old.client_name, old.status, old.examiner_name, old.header, old.sections, old.result, old.updated_by, old.updated_at, why);
  end if;
  return new;
end $$;

drop trigger if exists trg_report_versions on public.reports;
create trigger trg_report_versions
  before update or delete on public.reports
  for each row execute function public.snapshot_report();

create table if not exists public.org_addresses (
  organization text primary key,
  address      text not null,
  updated_at   timestamptz not null default now(),
  updated_by   text
);
alter table public.org_addresses enable row level security;
drop policy if exists org_addresses_select on public.org_addresses;
create policy org_addresses_select on public.org_addresses for select to authenticated using (true);
drop policy if exists org_addresses_write on public.org_addresses;
create policy org_addresses_write on public.org_addresses for insert to authenticated with check (true);
drop policy if exists org_addresses_update on public.org_addresses;
create policy org_addresses_update on public.org_addresses for update to authenticated using (true) with check (true);

insert into public.org_addresses (organization, address, updated_by) values
  ('Fauquier County Government', E'320 Hospital Drive, Third Floor\nWarrenton, VA 20186', 'setup'),
  ('Alexandria Fire Department', E'City of Alexandria\n100 North Pitt Street, Suite No. 301\nAlexandria, VA 22314', 'setup')
on conflict (organization) do nothing;
