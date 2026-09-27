-- =====================================================================
-- SAPPS Phase 2 — Examiner availability + examiner colors (9/27/2026)
--
-- ADDITIVE ONLY. No existing row's data is modified (the color update
-- below only fills the brand-new users.color column).
--
-- 1. users.color — each examiner's calendar color (hex). Tier 3 can
--    change it from the calendar key (users_update_admin already allows).
-- 2. examiner_availability — one row per examiner per available day,
--    with an optional note ("AM only", "Fairfax office"). Painted by the
--    office at the start of the month and adjusted any time.
--    Office-only: examiners and team leads don't see it.
-- =====================================================================

alter table public.users
  add column if not exists color text
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

create table if not exists public.examiner_availability (
  id          uuid primary key default gen_random_uuid(),
  examiner_id uuid not null references public.users(id) on delete cascade,
  date        date not null,
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (examiner_id, date)
);

create index if not exists examiner_availability_date_idx
  on public.examiner_availability (date);

alter table public.examiner_availability enable row level security;

drop policy if exists availability_office_all on public.examiner_availability;
create policy availability_office_all on public.examiner_availability
  for all to authenticated
  using (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]))
  with check (current_user_role() = any (array['payroll_admin'::user_role, 'office'::user_role]));

-- Starting colors for the current roster (the app's palette, in order of
-- how distinct they are from each other). Only fills NULLs.
update public.users set color = v.color
from (values
  ('crissmithpolygraph@gmail.com',            '#2A9D8F'),  -- Teal
  ('rjsmithpolygraph@gmail.com',              '#D0613F'),  -- Terracotta
  ('bdhhwt@gmail.com',                        '#4A86D6'),  -- Cornflower
  ('marcbmitchell@gmail.com',                 '#CF5A83'),  -- Rose
  ('polygraphprofessionalservices@gmail.com', '#8B6CC9'),  -- Violet
  ('nate.perkins@polyassessment.com',         '#5E8A2E'),  -- Moss
  ('amoorepoly@yahoo.com',                    '#A5539F')   -- Plum
) as v(email, color)
where lower(users.email) = lower(v.email) and users.color is null;
