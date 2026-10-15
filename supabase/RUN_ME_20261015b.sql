-- =====================================================================
-- SAPPS 10/15/2026 (b) — paste this whole file into Supabase → SQL Editor
-- → Run. Run it BEFORE deploying the matching frontend (the new build
-- reads columns this adds). Safe to run more than once. Additive only.
--
-- Hardening from the audit of the private-exams feature:
--   * Private exams lock at their START TIME (not midnight)
--   * Change history of every edit/removal (office-only)
--   * "Fee not set" stays pending instead of becoming $0
--   * Examiners can see when the office is taken by someone else
--   * Week submit records the private-office fee total
-- Full notes in migrations/20261015b_private_blocks_hardening.sql.
-- =====================================================================

begin;

-- 1. Guard (same rules as before, plus the start-time lock) ------------
create or replace function public.guard_private_blocks()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r       user_role;
  now_et  timestamp := (now() at time zone 'America/New_York');
  rate    numeric;
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
        select private_office_fee into rate from users where id = new.examiner_id;
        new.office_fee := rate;            -- NULL = no rate on file yet
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
    if (old.block_date + old.start_time) <= now_et then
      raise exception 'This private exam has already started, so it''s locked. Ask the office to change or remove it.' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;

  if new.examiner_id is distinct from auth.uid() then
    raise exception 'You can only log your own private exams.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.block_date + new.start_time) <= now_et then
    raise exception 'A private exam can''t be moved to a time that has already passed. Log a new one instead, or ask the office.' using errcode = '42501';
  end if;

  -- The fee always comes from the examiner's rate, never from the form.
  -- An edit that keeps it at the office keeps the fee it was logged with.
  -- No rate on file → NULL ("fee not set"), filled in by the office later.
  select private_office_fee into rate from users where id = auth.uid();
  new.office_fee  := case
                       when not new.at_office then 0
                       when tg_op = 'UPDATE' and old.at_office then coalesce(old.office_fee, rate)
                       else rate
                     end;
  new.deducted_at := null;
  new.deducted_by := null;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

-- 2. History ------------------------------------------------------------
create table if not exists public.private_blocks_history (
  id          bigint generated always as identity primary key,
  block_id    uuid not null,
  examiner_id uuid,
  action      text not null check (action in ('update', 'delete')),
  before      jsonb not null,
  after       jsonb,
  changed_by  uuid,
  changed_by_email text,
  changed_at  timestamptz not null default now()
);
create index if not exists private_blocks_history_block_idx on public.private_blocks_history (block_id);
create index if not exists private_blocks_history_when_idx  on public.private_blocks_history (changed_at);

create or replace function public.log_private_blocks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into private_blocks_history (block_id, examiner_id, action, before, after, changed_by, changed_by_email)
  values (
    old.id, old.examiner_id, lower(tg_op), to_jsonb(old),
    case when tg_op = 'UPDATE' then to_jsonb(new) end,
    auth.uid(), (select email from users where id = auth.uid())
  );
  return null;
end $$;

drop trigger if exists trg_log_private_blocks on public.private_blocks;
create trigger trg_log_private_blocks
  after update or delete on public.private_blocks
  for each row execute function public.log_private_blocks();

alter table public.private_blocks_history enable row level security;
drop policy if exists private_blocks_history_select on public.private_blocks_history;
create policy private_blocks_history_select on public.private_blocks_history
  for select to authenticated
  using (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]));
-- No insert/update/delete policies: only the trigger writes, nobody edits.
revoke insert, update, delete, truncate on public.private_blocks_history from anon, authenticated;
grant select on public.private_blocks_history to authenticated;

-- 3. Housekeeping -------------------------------------------------------
revoke truncate on public.private_blocks from anon, authenticated;

-- 4. (in the guard above) ----------------------------------------------

-- 5. Office busy-times for examiners ------------------------------------
create or replace function public.office_private_holds(from_date date, to_date date)
returns table (id uuid, examiner_id uuid, block_date date, start_time time, duration_minutes integer)
language sql stable security definer set search_path = public as $$
  select b.id, b.examiner_id, b.block_date, b.start_time, b.duration_minutes
  from private_blocks b
  where b.at_office
    and b.block_date between from_date and to_date
    and auth.uid() is not null
    and (to_date - from_date) <= 400;
$$;
revoke all on function public.office_private_holds(date, date) from public, anon;
grant execute on function public.office_private_holds(date, date) to authenticated;

-- 6. Week attestation total ---------------------------------------------
alter table public.week_submissions add column if not exists private_office_total numeric;


commit;
