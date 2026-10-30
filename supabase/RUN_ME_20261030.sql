-- =====================================================================
-- SAPPS 10/30/2026 — paste this whole file into Supabase → SQL Editor
-- → Run. Safe to run more than once.
--
-- Alexandria Fire Department moved. New address:
--   City of Alexandria Fire Department
--   900 Second St.
--   Alexandria, VA 22314
-- Reports pre-fill the agency address from org_addresses, which still
-- held the old 100 North Pitt Street address. This replaces it.
-- (Invoices read the address from the app code, updated in this build.)
-- =====================================================================

insert into public.org_addresses (organization, address, updated_at, updated_by)
values ('Alexandria Fire Department', E'900 Second St.\nAlexandria, VA 22314', now(), 'address update 10/30/2026')
on conflict (organization) do update
  set address = excluded.address, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

-- Check: should show 900 Second St.
select organization, address, updated_at from public.org_addresses
where organization = 'Alexandria Fire Department';
