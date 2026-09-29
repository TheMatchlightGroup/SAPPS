-- =====================================================================
-- SAPPS Phase 3b — Agency renames (9/29/2026, per Cris)
-- RUN AT DEPLOY TIME, together with the matching frontend build (the old
-- build doesn't know the new names).
--   Fauquier County Fire & Rescue  → Fauquier County Government (merged)
--   Loudoun Fire & Rescue          → Loudoun County Fire & Rescue
--   Arlington 911                  → Arlington County Department of Public Relations
-- Report TEXT is not edited (a report is a document as written); only the
-- organization field the library filters on.
-- =====================================================================
do $$
declare r record;
begin
  for r in select * from (values
    ('Fauquier County Fire & Rescue', 'Fauquier County Government'),
    ('Loudoun Fire & Rescue', 'Loudoun County Fire & Rescue'),
    ('Arlington 911', 'Arlington County Department of Public Relations')) as t(old_name, new_name)
  loop
    update public.exams           set organization = r.new_name where organization = r.old_name;
    update public.reports         set organization = r.new_name where organization = r.old_name;
    update public.invoices        set organization = r.new_name where organization = r.old_name;
    update public.org_pos         set organization = r.new_name where organization = r.old_name;
    update public.invoice_details set organization = r.new_name where organization = r.old_name;
  end loop;
end $$;
