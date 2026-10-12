-- =====================================================================
-- SAPPS 10/12/2026 — agency list update. Paste this whole file into
-- Supabase → SQL Editor → Run, AT DEPLOY TIME together with the matching
-- frontend build (the old build doesn't know the new names).
-- Safe to run more than once.
--
--   1. Renames (per SAPPS's Agency List):
--        Arlington County Department of Public Relations
--          → Arlington County Public Safety Communication & Emergency Management
--        Fairfax County Fire & Rescue
--          → Fairfax County Department of Public Safety Communications
--      Report TEXT is not edited (a report is a document as written); only
--      the organization field.
--   2. PO numbers from the list, saved per agency (org_pos) so they print
--      on every invoice. They can still be changed in "Fix a number".
--
-- Addresses and billing emails live in the app (src/lib/constants.js),
-- not the database — nothing to run for those.
-- =====================================================================

begin;

-- 1. Renames ----------------------------------------------------------
do $$
declare r record;
begin
  for r in select * from (values
    ('Arlington County Department of Public Relations', 'Arlington County Public Safety Communication & Emergency Management'),
    ('Fairfax County Fire & Rescue', 'Fairfax County Department of Public Safety Communications')
  ) as t(old_name, new_name)
  loop
    update public.exams           set organization = r.new_name where organization = r.old_name;
    update public.reports         set organization = r.new_name where organization = r.old_name;
    update public.invoices        set organization = r.new_name where organization = r.old_name;
    update public.org_pos         set organization = r.new_name where organization = r.old_name;
    update public.invoice_details set organization = r.new_name where organization = r.old_name;
    update public.org_addresses   set organization = r.new_name where organization = r.old_name;
  end loop;
end $$;

-- 2. PO numbers -------------------------------------------------------
insert into public.org_pos (organization, po_number, updated_at, updated_by) values
  ('Arlington County Public Safety Communication & Emergency Management', '2702541',     now(), 'agency list 10/12/2026'),
  ('Fairfax City Police Department',                                      '20270087',    now(), 'agency list 10/12/2026'),
  ('Fairfax County Sheriff''s Office',                                    '8500631662',  now(), 'agency list 10/12/2026'),
  ('Prince William Adult Detention Center',                               '544810-27',   now(), 'agency list 10/12/2026'),
  ('Prince William 911',                                                  '545165-27',   now(), 'agency list 10/12/2026'),
  ('Sex Offender Programs & Monitoring Unit',                             'PC005245782', now(), 'agency list 10/12/2026')
on conflict (organization) do update
  set po_number  = excluded.po_number,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;

commit;
