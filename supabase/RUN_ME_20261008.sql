-- =====================================================================
-- SAPPS 10/8/2026 — paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once. Two parts:
--   1. Sexual History template rebuilt from Cris's corrected Word file
--   2. Examiners may change the test type on their own completed exam
--      until the week is submitted or the report is marked final
-- =====================================================================

begin;

-- =====================================================================
-- SAPPS seed — Sexual History template rebuild (10/8/2026)
--
-- The Sexual History template was built from a Word file that turned out
-- to be the Instant Offense template, so it was missing the sexual-history
-- sections. Rebuilt from Cris's corrected VADOC Sexual History template:
--   + Sexual History Part I (definitions + additional victims)
--   + Sexual History Part II: Treatment and Sexual Behaviors
--   + Sexual Behaviors (21-item checklist)
--   * The Testing Phase: 4 relevant questions (was 2)
-- Wording is gender-neutral to match the other templates (9/29 edits).
-- The Word file's RE: line still says "INSTANT OFFENSE" — kept as
-- "Sexual History" here.
--
-- Updated IN PLACE (same template id). Existing reports keep the text they
-- were written with; examiners use "Update to the new template" / "Reload
-- from template" in the report editor. Backup of the old row kept in
-- report_templates_backup_20261008.
-- =====================================================================

create table if not exists public.report_templates_backup_20261008 as
  select * from public.report_templates where name = 'Sexual History Report';
alter table public.report_templates_backup_20261008 enable row level security;

update public.report_templates
   set sections = $tpl$[{"title": "RE: Sexual History Polygraph Examination", "body": "Per documentation you provided to our office, you authorized Smith & Associates Pre-Employment and Polygraph Services to test ________________, hereafter referred to as “Examinee,” regarding Examinee’s full sexual history. This polygraph examination was conducted for utility purposes. The time frame covered was Examinee’s entire lifetime, until the start of active probation."}, {"title": "Pre-Test Interview", "body": "Examinee was advised of the identity of the interviewing polygraph examiner and the purpose of the interview and polygraph examination. Examinee executed the Standards of Practice and the Consent to Polygraph Examination & Release of Liability forms prior to the pre-test interview."}, {"title": "Health Section", "body": "Physical Health: Examinee denied any previous or current physical health conditions that would interfere with Examinee’s ability to undergo this polygraph examination.\n\nMental Health: Examinee denied any previous or current mental health conditions that would interfere with Examinee’s ability to undergo this polygraph examination.\n\nMedication: Examinee reported there has been no change to Examinee’s prescription medication in the past 30 days.\n\nRest: Examinee reported being well rested, sleeping approximately ____ hours the night prior to this polygraph examination."}, {"title": "Instant Offense", "body": "Examinee reported being convicted of (Offense) on (Date). Examinee was sentenced in ________ to ________ (brief sentencing information). Upon release on ________, Examinee was placed on active probation.\n\n[EXPLAIN OFFENSE CLEARLY — DEFINE WHAT THE PSI SAYS AND WHAT THE PROBATIONER SAYS]"}, {"title": "Sexual History Part I", "body": "The following definitions were reviewed with Examinee, who indicated understanding each definition and agreed with the definitions:\n\n- Minor: Someone you know, suspect, or self-reported being under the age of 18.\n- Sexual Contact: Prolonged kissing on the lips; French kissing; touching or fondling genitals including breasts, nipples, buttocks, vagina or penis; insertion of objects or body parts into a vagina or anus; oral copulation; vaginal or anal intercourse.\n- Non-Consensual: Any sexual contact without consent or permission of the other person. This can be someone under the age of eighteen since you turned eighteen; under the age of eighteen and engaging in sexual contact with someone more than three years younger than you, verbal; non-verbal; mood or emotional changes; under the influence of alcohol; illegal drugs, or narcotic prescription medication; sleeping or passed out; mentally unable to comprehend the sexual contact.\n- Use of Force: The use of actual physical force (strength) or threat of physical force against someone to engage in sexual contact; the use of or threat of a weapon against someone to engage in sexual contact; the verbal threat to hurt someone or someone they care about engaging in sexual contact.\n- Sexual Gratification: Deliberate or intentional acts, or attempted acts, for the purpose of self-mental, visual, or physical sexual pleasure. The acts could be with yourself, such as exposing your genitals, touching or masturbating your genitals, rubbing your genitals on someone, the use of objects, such as sex toys, etc. Also included is the touching of another person, can be the genitals, or other body parts, for your sexual stimulation, with or without that person’s knowledge. The use of thoughts, memories, or fantasies of someone for self-mental or physical sexual gratification. This could be thoughts of a person while masturbating, or as an example, having sexual thoughts or fantasies of someone without physically masturbating, but rather for the mental stimulus/excitement.\n\nExaminee reported the following additional victims of Examinee’s physical sexual abuse:\n\nOther Minor Victims: \n\nUse of Force: \n\nUse of Drugs or Alcohol: \n\nProstitution: \n\nFamily: "}, {"title": "Sexual History Part II: Treatment and Sexual Behaviors", "body": "Sex Offender Treatment: \n\nPornography: Examinee reported the following viewing of pornographic material:\n- Magazines: \n- Videos: \n- Adult Internet Pornography: \n- Child Pornography: \n\nMasturbation: \n\nCurrent Relationship: \n\nPast Consensual Female Partners: \n\nPast Consensual Male / Transgender Partners: "}, {"title": "Sexual Behaviors", "body": "Phone Sex/Sexting with Adults/Minors: \n\nOnline Sexual Communication with Adults/Minors: \n\nPublic Masturbation: \n\nUse of Opposite Sex Clothing for Sexual Purposes: \n\nBestiality: \n\nExhibitionism: \n\nVoyeurism: \n\nSexual Contact with Family Members: \n\nTaking Pictures/Videos of Minors for Sexual Purposes: \n\nFrottage: \n\nTorturing Animals: \n\nSetting Fire for Sexual Pleasure: \n\nFetishes: \n\nForced Sexual Contact: \n\nTranssexualism: \n\nTransvestitism: \n\nSadism/Masochism: \n\nUrolagnia: \n\nCoprophilia: \n\nNecrophilia: \n\nVictim of Sexual Abuse: "}, {"title": "The Testing Phase", "body": "Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information Examinee provided during the pre-test interview.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and Examinee’s test answers:\n\nRELEVANT Q1: ________________________________\nANSWER: No\n\nRELEVANT Q2: ________________________________\nANSWER: No\n\nRELEVANT Q3: ________________________________\nANSWER: No\n\nRELEVANT Q4: ________________________________\nANSWER: No"}, {"title": "The Evaluation Phase", "body": "Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT RESPONSE\n\nProfessional Opinion: Examinee’s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n— OR (delete whichever block does not apply) —\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nSIGNIFICANT RESPONSE: Numerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__ above regarding ____________. Because of Examinee’s focus on this Relevant Question, Examinee’s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee’s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"}, {"title": "Post Test Phase", "body": "Examinee was informed of the polygraph results, and a post-test interview was conducted. Examinee made no additional statements nor admissions."}]$tpl$::jsonb
 where name = 'Sexual History Report';

-- Guard: fail if any gendered pronoun slipped in.
do $$
declare bad text;
begin
  select string_agg(name, ', ') into bad from public.report_templates
   where name = 'Sexual History Report'
     and sections::text ~* '\m(he|she|his|her|him|hers|himself|herself)\M';
  if bad is not null then raise exception 'Pronouns remain in: %', bad; end if;
end $$;

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

-- leftover scratch table from a partial load attempt
drop table if exists public._sh_stage;

commit;

-- Check: should show 10 sections and pronouns = false
select jsonb_array_length(sections) as sections, sections::text ~* '\m(he|she|his|her|him|hers|himself|herself)\M' as pronouns from public.report_templates where name = 'Sexual History Report';
