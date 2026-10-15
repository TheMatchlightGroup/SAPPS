-- =====================================================================
-- SAPPS 10/15/2026 — paste this whole file into Supabase → SQL Editor →
-- Run, at deploy time together with the matching frontend build.
-- Safe to run more than once. Additive only.
--
--   Private exams on the calendar + private office-use fees.
--   (Brad $75 / Marc $100 per exam — Rob to confirm; change any time on
--   the Payroll page.) Full notes in migrations/20261015_private_blocks.sql.
--
-- The new agency (United States Probation Office) lives in the app
-- (src/lib/constants.js) — nothing to run for it.
-- =====================================================================

begin;

-- 1. Per-examiner fee ------------------------------------------------
alter table public.users
  add column if not exists private_office_fee numeric
  check (private_office_fee is null or private_office_fee >= 0);

update public.users set private_office_fee = v.fee
from (values
  ('bdhhwt@gmail.com',       75),  -- Brad Hughes  (confirm)
  ('marcbmitchell@gmail.com', 100) -- Marc Mitchell (confirm)
) as v(email, fee)
where lower(users.email) = lower(v.email) and users.private_office_fee is null;

-- 2. The blocks ------------------------------------------------------
create table if not exists public.private_blocks (
  id               uuid primary key default gen_random_uuid(),
  examiner_id      uuid not null references public.users(id) on delete cascade,
  block_date       date not null,
  start_time       time not null,
  duration_minutes integer not null default 120 check (duration_minutes between 15 and 720),
  at_office        boolean not null default true,
  office_fee       numeric check (office_fee is null or office_fee >= 0),  -- filled by the guard
  note             text check (note is null or length(note) <= 200),
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz not null default now(),
  updated_by       text,
  deducted_at      timestamptz,
  deducted_by      text
);

create index if not exists private_blocks_date_idx     on public.private_blocks (block_date);
create index if not exists private_blocks_examiner_idx on public.private_blocks (examiner_id, block_date);

-- 3a. Guard ----------------------------------------------------------
create or replace function public.guard_private_blocks()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r     user_role;
  today date := (now() at time zone 'America/New_York')::date;
  rate  numeric;
begin
  if auth.uid() is null then                                      -- SQL editor
    if tg_op <> 'DELETE' then new.office_fee := coalesce(new.office_fee, 0); end if;
    return coalesce(new, old);
  end if;
  r := current_user_role();

  if tg_op <> 'DELETE' then
    new.updated_at := now();
  end if;

  -- Office: unrestricted, and may set any fee. No fee given → the
  -- examiner's rate (or $0 when it isn't at the office).
  if r in ('payroll_admin'::user_role, 'office'::user_role) then
    if tg_op <> 'DELETE' and new.office_fee is null then
      if new.at_office then
        select coalesce(private_office_fee, 0) into rate from users where id = new.examiner_id;
        new.office_fee := coalesce(rate, 0);
      else
        new.office_fee := 0;
      end if;
    end if;
    return coalesce(new, old);
  end if;

  -- Examiners / team leads: their own rows only.
  if tg_op in ('UPDATE', 'DELETE') then
    if old.examiner_id is distinct from auth.uid() then
      raise exception 'You can only change your own private exams.' using errcode = '42501';
    end if;
    if old.deducted_at is not null then
      raise exception 'Payroll has already deducted this one. Ask the office to change it.' using errcode = '42501';
    end if;
    if old.block_date < today then
      raise exception 'Past private exams are locked. Ask the office to change or remove it.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;

  if new.examiner_id is distinct from auth.uid() then
    raise exception 'You can only log your own private exams.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.block_date < today then
    raise exception 'A private exam can''t be moved into the past. Log a new one instead, or ask the office.' using errcode = '42501';
  end if;

  -- The fee always comes from the examiner's rate, never from the form.
  -- An edit that keeps it at the office keeps the fee it was logged with.
  select coalesce(private_office_fee, 0) into rate from users where id = auth.uid();
  new.office_fee  := case
                       when not new.at_office then 0
                       when tg_op = 'UPDATE' and old.at_office then old.office_fee
                       else rate
                     end;
  new.deducted_at := null;
  new.deducted_by := null;
  if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  return new;
end $$;

drop trigger if exists trg_guard_private_blocks on public.private_blocks;
create trigger trg_guard_private_blocks
  before insert or update or delete on public.private_blocks
  for each row execute function public.guard_private_blocks();

-- 3b. Row-level security --------------------------------------------
alter table public.private_blocks enable row level security;

drop policy if exists private_blocks_select on public.private_blocks;
create policy private_blocks_select on public.private_blocks
  for select to authenticated
  using (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]) or examiner_id = auth.uid());

drop policy if exists private_blocks_insert on public.private_blocks;
create policy private_blocks_insert on public.private_blocks
  for insert to authenticated
  with check (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]) or examiner_id = auth.uid());

drop policy if exists private_blocks_update on public.private_blocks;
create policy private_blocks_update on public.private_blocks
  for update to authenticated
  using (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]) or examiner_id = auth.uid())
  with check (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]) or examiner_id = auth.uid());

drop policy if exists private_blocks_delete on public.private_blocks;
create policy private_blocks_delete on public.private_blocks
  for delete to authenticated
  using (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]) or examiner_id = auth.uid());

grant select, insert, update, delete on public.private_blocks to authenticated;

-- 4. Week attestation -------------------------------------------------
alter table public.week_submissions add column if not exists private_office_count integer;

commit;
