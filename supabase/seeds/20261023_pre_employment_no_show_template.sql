-- =====================================================================
-- SAPPS seed — Pre-Employment No-Show Report template (10/23/2026)
--
-- Per Cris: the major agencies now require a written no-show report for
-- pre-employment exams. Built from Cris's Word template
-- (C26-63 ArlingtonFire Edward Mendoza No Show), kept deliberately simple:
--   header  = Name, Gender, Date of Exam, Time of Exam, Agency, Agency Address
--             (DOB / Age / Birthplace / SSN dropped — always N/A on a no-show)
--   result  = NO SHOW (the only option, pre-selected)
--   text    = The Preparation + The Pre-Test Interview Phase, with the
--             examinee's name and agency filled in from the exam ({{name}},
--             {{agency}}). Examiners can add notes in the text box.
-- Wording is gender-neutral to match the other templates.
-- Frontend: 'Pre-Employment No Show' moves out of NO_REPORT_TYPES; exams
-- dated 10/23/2026 or later need this report before the week can go to
-- payroll (same 5-business-day grace as every other report).
-- ADDITIVE ONLY. Safe to re-run.
-- =====================================================================

insert into public.report_templates (name, test_types, header_fields, sections, results, active)
select
  'Pre-Employment No Show Report',
  array['Pre-Employment No Show'],
  $hf$[
    {"key": "name",           "label": "Name",           "prefill": "client_name"},
    {"key": "gender",         "label": "Gender"},
    {"key": "date_of_exam",   "label": "Date of Exam",   "prefill": "exam_date"},
    {"key": "time_of_exam",   "label": "Time of Exam",   "prefill": "exam_time"},
    {"key": "agency",         "label": "Agency",         "prefill": "organization"},
    {"key": "agency_address", "label": "Agency Address", "prefill": "org_address"}
  ]$hf$::jsonb,
  $sec$[
    {"title": "The Preparation",
     "body": "Per the documentation provided to our office, you requested {{name}} be tested as part of the pre-employment screening application process for {{agency}}."},
    {"title": "The Pre-Test Interview Phase",
     "body": "Per your request, a Pre-Employment Polygraph Examination was to be administered to {{name}}. {{name}} failed to report to the SAPPS office for the scheduled polygraph examination as instructed. This test will be assessed as a no-show."}
  ]$sec$::jsonb,
  '["NO SHOW"]'::jsonb,
  true
where not exists (
  select 1 from public.report_templates where name = 'Pre-Employment No Show Report'
);
