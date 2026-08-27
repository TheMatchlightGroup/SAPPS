-- =====================================================================
-- SAPPS report template seeds — VADOC probation family (8/15/2026)
-- Source: Maintenance/Monitoring go-by, Instant Offense, Sexual
-- History, Specific Issue Word templates from Cris/Rob.
--
-- Cleanup vs. the Word originals: the Sexual History RE: line said
-- "INSTANT OFFENSE" (copy-paste artifact, corrected); go-by sample
-- data (spouse/employer/counselor names, dates, example questions)
-- genericized to blanks; "her physiological responses" normalized.
--
-- Idempotent-ish: deletes prior template rows by name before insert.
-- =====================================================================

delete from public.report_templates where name in (
  'Maintenance / Monitoring Report',
  'Instant Offense Report',
  'Sexual History Report',
  'Specific Issue Report'
);

-- Shared VADOC header fields (officer block + case identity grid)
-- and shared result options are repeated per insert for portability.

insert into public.report_templates (name, test_types, header_fields, sections, results, active) values
(
  'Maintenance / Monitoring Report',
  array['Maintenance','Monitoring'],
  '[
    {"key":"officer","label":"Officer Name"},
    {"key":"district","label":"District","prefill":"organization"},
    {"key":"district_address","label":"District Address","prefill":"org_address"},
    {"key":"name","label":"Name","prefill":"client_name"},
    {"key":"case","label":"Case #"},
    {"key":"dob","label":"DOB"},
    {"key":"age","label":"Age"},
    {"key":"date_of_exam","label":"Date of Exam","prefill":"exam_date"},
    {"key":"time_of_exam","label":"Time of Exam","prefill":"exam_time"}
  ]'::jsonb,
  $tpl$[
    {"title":"RE: Maintenance / Monitoring Polygraph Examination","body":"Per documentation you provided to our office, you authorized Smith & Associates Pre-Employment and Polygraph Services, LLC, to test ________________, hereafter referred to as \u201cExaminee,\u201d regarding his probation conditions. This polygraph examination was conducted for utility purposes. The time frame is from ________________ until today\u2019s date."},
    {"title":"Pre-Test Interview","body":"Examinee was advised of the identity of the interviewing polygraph examiner and the purpose of the interview and polygraph examination. Examinee executed the Standards of Practice & Consent to Polygraph Examination and the Release of Liability forms prior to the pre-test interview."},
    {"title":"Health Section","body":"Physical Health: Examinee denied any previous or current physical health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMental Health: Examinee denied any previous or current mental health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMedication: Examinee reported there has been no change to his prescription medication in the past 30 days.\n\nRest: Examinee reported he is well rested, sleeping approximately ____ hours the night prior to this polygraph examination."},
    {"title":"Instant Offense","body":"Examinee reported he was convicted of (Offense) on (Date). He was sentenced in ________ to ________ (brief sentencing information). Upon his release on ________, Examinee was placed on active probation."},
    {"title":"Probation Issues","body":"Residence: Examinee currently resides with ________________.\n\nEmployment: Examinee is currently employed ________________.\n\nSupervision: Examinee reported he currently meets with his supervising Probation Officer at least once a month as instructed. Examinee stated he currently has no issues with his supervising officer.\n\nConsumption of alcohol: None\n\nMarijuana: None\n\nIllegal drug or prescription use/involvement: None\n\nPossession/use of weapons: None\n\nGang activity: None\n\nDomestic violence/assault: None\n\nCriminal activity: None\n\nOfficial contact with police: ________________\n\nUnauthorized travel: Examinee denied any travel outside his given radius without permission.\n\nSex Offender Registry: Accurate and up to date.\n\nCurfew: ________ to ________. Examinee reported not being late without permission.\n\nGPS: None"},
    {"title":"Treatment Issues","body":"Treatment provider: Examinee currently attends ________________ treatment with ________________, ____ per week. Examinee reported no issues with therapy, his counselor, or other group members.\n\nMental Health: None\n\nAA/NA/SSA: None"},
    {"title":"Relationship / Sexual Behavior","body":"Relationship / Sexual Contact: ________________. Examinee denied engaging in sexual contact with anyone other than ________________. All sexual contact is consensual and in private.\n\nMasturbation: Examinee masturbates in private ____ times a ____ to thoughts of ________________.\n\nPornographic Material:\n- Hardcore Pornographic Material: Examinee denied viewing this material (magazines, DVD, internet)\n- Sexually Explicit Material: Examinee denied the use of this material for sexual stimulation or masturbatory purposes\n- Other Material for sexual stimulation/masturbation: Examinee denied the use of any non-sexually suggestive material for sexual stimulation or masturbatory purposes.\n\nElectronic Devices: Examinee accesses the internet via ________________.\n\nInternet: Examinee denied accessing chatrooms, dating sites, social media, live camera sites, or pornographic sites. Examinee also denied the viewing of any material online for the purpose of visual or physical sexual stimulation.\n\nOnline Sexual Communication: Examinee denied engaging in online sexual communication or the exchange of any sexual material via the internet.\n\nFantasies/Thoughts: Examinee has not had sexual thoughts or fantasies regarding the victim of his offense."},
    {"title":"Contact","body":"Contact with past victims: None (Physical, visual, online chats, social media, text messages, phone calls, emails, letters, or third party)\n\nContact with minors:\n- Approved Chaperone: None\n- Family Safety Contract: None\n- Supervised: None\n- Unsupervised: None\n- Alone: None\n- Incidental: Examinee has been around unknown minors in public places. Examinee denied any conversations or physical contact with any of the minors."},
    {"title":"Denied Sexual Behaviors","body":"Examinee reported he has not engaged in any of the following sexual behavior(s) during this reporting period:\n\n- Public masturbation, use of female clothing for masturbation, bestiality, exhibitionism, voyeurism, sexual contact with family members, taking pictures/videos of minors, frottage, torturing animals, setting of fires, use of a prostitute, accused of sexual harassment, fetishes, non-consensual sexual contact, forced sexual contact, transsexualism, transvestitism, sadism, masochism, urolagnia, coprophilia, necrophilia, victim of sexual abuse."},
    {"title":"The Testing Phase","body":"Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information he provided during the pre-test interview.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and Examinee\u2019s test answers:\n\nRELEVANT Q1: ________________________________\nANSWER: No\n\nRELEVANT Q2: ________________________________\nANSWER: No\n\nRELEVANT Q3: ________________________________\nANSWER: No"},
    {"title":"The Evaluation Phase","body":"Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT RESPONSE\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n\u2014 OR (delete whichever block does not apply) \u2014\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nSIGNIFICANT RESPONSE: Numerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__ above regarding ____________. Because of Examinee\u2019s focus on this Relevant Question, Examinee\u2019s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"},
    {"title":"Post Test Phase","body":"Examinee was informed of the polygraph results, and a post-test interview was conducted. Examinee made no additional statements nor admissions."}
  ]$tpl$::jsonb,
  '["NO SIGNIFICANT RESPONSE / NO DECEPTION INDICATED","SIGNIFICANT RESPONSE / DECEPTION INDICATED","INCONCLUSIVE / NO OPINION"]'::jsonb,
  true
),
(
  'Instant Offense Report',
  array['Instant Offense'],
  '[
    {"key":"officer","label":"Officer Name"},
    {"key":"district","label":"District","prefill":"organization"},
    {"key":"district_address","label":"District Address","prefill":"org_address"},
    {"key":"name","label":"Name","prefill":"client_name"},
    {"key":"case","label":"Case #"},
    {"key":"dob","label":"DOB"},
    {"key":"age","label":"Age"},
    {"key":"date_of_exam","label":"Date of Exam","prefill":"exam_date"},
    {"key":"time_of_exam","label":"Time of Exam","prefill":"exam_time"}
  ]'::jsonb,
  $tpl$[
    {"title":"RE: Instant Offense Polygraph Examination","body":"Per documentation you provided to our office, you authorized Smith & Associates Pre-Employment and Polygraph Services to test ________________, hereafter referred to as \u201cExaminee,\u201d regarding the instant offense. This polygraph examination was conducted for utility purposes. The time frame covered was the time of the instant offense until today\u2019s date."},
    {"title":"Pre-Test Interview","body":"Examinee was advised of the identity of the interviewing polygraph examiner and the purpose of the interview and polygraph examination. Examinee executed the Standards of Practice and the Consent to Polygraph Examination & Release of Liability forms prior to the pre-test interview."},
    {"title":"Health Section","body":"Physical Health: Examinee denied any previous or current physical health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMental Health: Examinee denied any previous or current mental health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMedication: Examinee reported there has been no change to his prescription medication in the past 30 days.\n\nRest: Examinee reported he is well rested, sleeping approximately ____ hours the night prior to this polygraph examination."},
    {"title":"Instant Offense","body":"Examinee reported he was convicted of (Offense) on (Date). He was sentenced in ________ to ________ (brief sentencing information). Upon his release on ________, Examinee was placed on active probation.\n\n[EXPLAIN OFFENSE CLEARLY \u2014 DEFINE WHAT THE PSI SAYS AND WHAT THE PROBATIONER SAYS]"},
    {"title":"The Testing Phase","body":"Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information he provided during the pre-test interview.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and Examinee\u2019s test answers:\n\nRELEVANT Q1: ________________________________\nANSWER: No\n\nRELEVANT Q2: ________________________________\nANSWER: No"},
    {"title":"The Evaluation Phase","body":"Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT RESPONSE\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n\u2014 OR (delete whichever block does not apply) \u2014\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nSIGNIFICANT RESPONSE: Numerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__ above regarding ____________. Because of Examinee\u2019s focus on this Relevant Question, Examinee\u2019s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"},
    {"title":"Post Test Phase","body":"Examinee was informed of the polygraph results, and a post-test interview was conducted. Examinee made no additional statements nor admissions."}
  ]$tpl$::jsonb,
  '["NO SIGNIFICANT RESPONSE / NO DECEPTION INDICATED","SIGNIFICANT RESPONSE / DECEPTION INDICATED","INCONCLUSIVE / NO OPINION"]'::jsonb,
  true
),
(
  'Sexual History Report',
  array['Sexual History','Sexual History Retest'],
  '[
    {"key":"officer","label":"Officer Name"},
    {"key":"district","label":"District","prefill":"organization"},
    {"key":"district_address","label":"District Address","prefill":"org_address"},
    {"key":"name","label":"Name","prefill":"client_name"},
    {"key":"case","label":"Case #"},
    {"key":"dob","label":"DOB"},
    {"key":"age","label":"Age"},
    {"key":"date_of_exam","label":"Date of Exam","prefill":"exam_date"},
    {"key":"time_of_exam","label":"Time of Exam","prefill":"exam_time"}
  ]'::jsonb,
  $tpl$[
    {"title":"RE: Sexual History Polygraph Examination","body":"Per documentation you provided to our office, you authorized Smith & Associates Pre-Employment and Polygraph Services to test ________________, hereafter referred to as \u201cExaminee,\u201d regarding his full sexual history. This polygraph examination was conducted for utility purposes. The time frame covered was his entire lifetime, until the start of active probation."},
    {"title":"Pre-Test Interview","body":"Examinee was advised of the identity of the interviewing polygraph examiner and the purpose of the interview and polygraph examination. Examinee executed the Standards of Practice and the Consent to Polygraph Examination & Release of Liability forms prior to the pre-test interview."},
    {"title":"Health Section","body":"Physical Health: Examinee denied any previous or current physical health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMental Health: Examinee denied any previous or current mental health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMedication: Examinee reported there has been no change to his prescription medication in the past 30 days.\n\nRest: Examinee reported he is well rested, sleeping approximately ____ hours the night prior to this polygraph examination."},
    {"title":"Instant Offense","body":"Examinee reported he was convicted of (Offense) on (Date). He was sentenced in ________ to ________ (brief sentencing information). Upon his release on ________, Examinee was placed on active probation.\n\n[EXPLAIN OFFENSE CLEARLY \u2014 DEFINE WHAT THE PSI SAYS AND WHAT THE PROBATIONER SAYS]"},
    {"title":"The Testing Phase","body":"Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information he provided during the pre-test interview.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and Examinee\u2019s test answers:\n\nRELEVANT Q1: ________________________________\nANSWER: No\n\nRELEVANT Q2: ________________________________\nANSWER: No"},
    {"title":"The Evaluation Phase","body":"Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT RESPONSE\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n\u2014 OR (delete whichever block does not apply) \u2014\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nSIGNIFICANT RESPONSE: Numerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__ above regarding ____________. Because of Examinee\u2019s focus on this Relevant Question, Examinee\u2019s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"},
    {"title":"Post Test Phase","body":"Examinee was informed of the polygraph results, and a post-test interview was conducted. Examinee made no additional statements nor admissions."}
  ]$tpl$::jsonb,
  '["NO SIGNIFICANT RESPONSE / NO DECEPTION INDICATED","SIGNIFICANT RESPONSE / DECEPTION INDICATED","INCONCLUSIVE / NO OPINION"]'::jsonb,
  true
),
(
  'Specific Issue Report',
  array['Specific Issue'],
  '[
    {"key":"officer","label":"Officer Name"},
    {"key":"district","label":"District","prefill":"organization"},
    {"key":"district_address","label":"District Address","prefill":"org_address"},
    {"key":"name","label":"Name","prefill":"client_name"},
    {"key":"case","label":"Case #"},
    {"key":"dob","label":"DOB"},
    {"key":"age","label":"Age"},
    {"key":"date_of_exam","label":"Date of Exam","prefill":"exam_date"},
    {"key":"time_of_exam","label":"Time of Exam","prefill":"exam_time"}
  ]'::jsonb,
  $tpl$[
    {"title":"RE: Specific Issue Polygraph Examination","body":"Per documentation you provided to our office, you authorized Smith & Associates Pre-Employment and Polygraph Services to test ________________, hereafter referred to as \u201cExaminee,\u201d regarding ________________. This polygraph examination was conducted for utility purposes. The time frame covered was ________________."},
    {"title":"Pre-Test Interview","body":"Examinee was advised of the identity of the interviewing polygraph examiner and the purpose of the interview and polygraph examination. Examinee executed the Standards of Practice and the Consent to Polygraph Examination & Release of Liability forms prior to the pre-test interview."},
    {"title":"Health Section","body":"Physical Health: Examinee denied any previous or current physical health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMental Health: Examinee denied any previous or current mental health conditions that would interfere with his ability to undergo this polygraph examination.\n\nMedication: Examinee reported there has been no change to his prescription medication in the past 30 days.\n\nRest: Examinee reported he is well rested, sleeping approximately ____ hours the night prior to this polygraph examination."},
    {"title":"Instant Offense","body":"Examinee reported he was convicted of (Offense) on (Date). He was sentenced in ________ to ________ (brief sentencing information). Upon his release on ________, Examinee was placed on active probation."},
    {"title":"Specific Issue","body":"[EXPLAIN THE GIVEN SITUATION CLEARLY \u2014 INCLUDE THE ALLEGATION AND WHAT THE PROBATIONER SAYS]"},
    {"title":"The Testing Phase","body":"Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information he provided during the pre-test interview.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and Examinee\u2019s test answers:\n\nRELEVANT Q1: ________________________________\nANSWER: No\n\nRELEVANT Q2: ________________________________\nANSWER: No"},
    {"title":"The Evaluation Phase","body":"Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT RESPONSE\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n\u2014 OR (delete whichever block does not apply) \u2014\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nSIGNIFICANT RESPONSE: Numerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__ above regarding ____________. Because of Examinee\u2019s focus on this Relevant Question, Examinee\u2019s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee\u2019s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"},
    {"title":"Post Test Phase","body":"Examinee was informed of the polygraph results, and a post-test interview was conducted. Examinee made no additional statements nor admissions."}
  ]$tpl$::jsonb,
  '["NO SIGNIFICANT RESPONSE / NO DECEPTION INDICATED","SIGNIFICANT RESPONSE / DECEPTION INDICATED","INCONCLUSIVE / NO OPINION"]'::jsonb,
  true
);
