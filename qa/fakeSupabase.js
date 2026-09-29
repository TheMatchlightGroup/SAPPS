// In-memory Supabase stand-in for UI smoke tests (no network in the sandbox).
const ADMIN = { id: 'u-admin', email: 'qa@sapps.test', user_metadata: { name: 'QA Admin' } }
const EXAMINER = { id: 'u-brad', email: 'bdhhwt@gmail.com', user_metadata: { name: 'Brad Hughes' } }
const LEAD = { id: 'u-lead', email: 'lead@sapps.test', user_metadata: { name: 'Lee Lead' } }
const qaRole = typeof window !== 'undefined' ? window.__QA_ROLE : null
const who = qaRole === 'examiner' ? EXAMINER : qaRole === 'team_lead' ? LEAD : ADMIN
const d = (n) => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10) }
const ym = new Date().toISOString().slice(0, 7)
const tables = {
  users: [
    { id: 'u-admin', email: 'qa@sapps.test', name: 'QA Admin', role: 'payroll_admin', active: true, is_examiner: false, must_change_password: false },
    { id: 'u-brad', email: 'bdhhwt@gmail.com', name: 'Brad Hughes', role: 'examiner', color: '#4A86D6', active: true, is_examiner: true, must_change_password: true },
    { id: 'u-lead', email: 'lead@sapps.test', name: 'Lee Lead', role: 'team_lead', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-al', email: 'amoorepoly@yahoo.com', name: 'Al Moore', role: 'examiner', active: true, is_examiner: true, must_change_password: false },
  ],
  exams: [
    { id: 'e1', client_name: 'T. Boyd', exam_date: d(-9), exam_time: '13:00', exam_type: 'Maintenance', organization: 'Manassas', duration_minutes: 90, status: 'completed', examiner_id: 'u-brad' },
    { id: 'e2', client_name: 'M. Ruiz', exam_date: d(-8), exam_time: '10:00', exam_type: 'Sexual History', organization: 'Manassas', duration_minutes: 90, status: 'completed', examiner_id: 'u-brad' },
    { id: 'e3', client_name: 'K. Lane', exam_date: d(-3), exam_time: '09:00', exam_type: null, organization: 'Winchester', duration_minutes: 90, status: 'scheduled', examiner_id: 'u-brad' },
    { id: 'e4', client_name: 'R. Diaz', exam_date: d(2), exam_time: '11:00', exam_type: null, organization: 'Charlottesville', duration_minutes: 90, status: 'scheduled', examiner_id: 'u-al' },
    { id: 'e6', client_name: 'J. Fairfax', exam_date: d(-7), exam_time: '14:00', exam_type: 'Pre-Employment', organization: 'Manassas', duration_minutes: 90, status: 'completed', examiner_id: 'u-lead' },
    { id: 'e7', client_name: 'P. Nguyen', exam_date: d(-1), exam_time: '15:00', exam_type: null, organization: 'Winchester', duration_minutes: 90, status: 'scheduled', examiner_id: 'u-brad' },
    ...['08:00', '09:30', '11:00', '13:00', '14:30', '16:00'].map((t, i) => ({ id: 'm' + i, client_name: ['A. Stone', 'B. Clark', 'C. Ortiz', 'D. Park', 'E. Wynn', 'F. Holt'][i], exam_date: d(2), exam_time: t, exam_type: null, organization: 'Arlington County Fire & Rescue', duration_minutes: 90, status: 'scheduled', examiner_id: ['u-brad', 'u-al', 'u-lead', 'u-brad', 'u-al', 'u-lead'][i] })),
    { id: 'e8', client_name: 'Dana Whitfield', exam_date: d(-4), exam_time: '10:00', exam_type: 'Pre-Employment', organization: 'Fauquier County Government', duration_minutes: 120, status: 'completed', examiner_id: 'u-brad' },
    { id: 'e5', client_name: 'A. Boyden', exam_date: d(-12), exam_time: '09:00', exam_type: 'Pre-Employment No Show', organization: 'Virginia Center for Behavioral Rehabilitation', duration_minutes: 60, status: 'completed', examiner_id: 'u-al' },
  ],
  intake_forms: [
    { exam_id: 'e1', exam_amount: 225, copay_amount: 25, amount_due_examiner: 125, amount_due_sapps: 25, status: 'submitted' },
    { exam_id: 'e2', copay_amount: 0, amount_due_examiner: 150, amount_due_sapps: 25, status: 'submitted' }, // legacy row: no exam_amount
    { exam_id: 'e6', copay_amount: 225, amount_due_examiner: 0, amount_due_sapps: 0, status: 'submitted' }, // legacy "price typed as copay" row
    { exam_id: 'e5', copay_amount: 0, amount_due_examiner: 0, amount_due_sapps: 100, status: 'submitted' },
  ],
  examiner_availability: [
    { examiner_id: 'u-brad', date: d(1), note: null }, { examiner_id: 'u-brad', date: d(2), note: 'AM only' },
    { examiner_id: 'u-al', date: d(1), note: null }, { examiner_id: 'u-lead', date: d(1), note: null },
    { examiner_id: 'u-al', date: d(3), note: null },
  ],
  report_versions: [
    { id: 'v1', report_id: 'r1', status: 'draft', examiner_name: 'Brad Hughes', header: { name: 'T. Boyd' }, sections: [{ title: 'Pre-Test Phase', body: 'An earlier draft of this section.' }], result: '', saved_by: 'bdhhwt@gmail.com', content_at: '2026-09-20T14:00:00Z', snapshot_at: '2026-09-20T15:00:00Z', reason: 'before status change' },
  ],
  org_addresses: [{ organization: 'Winchester', address: 'Probation & Parole District 11\n100 Example Street\nWinchester, VA 22601' }],
  invoices: [], org_pos: [{ organization: 'Virginia Center for Behavioral Rehabilitation', po_number: 'PO-44821' }], invoice_details: [],
  week_submissions: [], reports: [
    { id: 'r1', exam_id: 'e1', examiner_id: 'u-brad', examiner_name: 'Brad Hughes', client_name: 'T. Boyd', organization: 'Manassas', exam_date: d(-9), exam_type: 'Maintenance', status: 'final', header: { client_name: 'T. Boyd' }, sections: [{ title: 'Pre-Test Phase', body: 'Brad\'s finished text.' }], result: 'No Deception Indicated', template_id: 't1', updated_at: '2026-09-21T16:00:00Z', updated_by: 'bdhhwt@gmail.com' },
  ],
  report_templates: [{"id": "t2", "name": "Pre-Employment Report", "test_types": ["Pre-Employment"], "header_fields": [{"key": "name", "label": "Name", "prefill": "client_name"}, {"key": "gender", "label": "Gender"}, {"key": "dob", "label": "DOB"}, {"key": "age", "label": "Age"}, {"key": "birthplace", "label": "Birthplace"}, {"key": "ssn", "label": "SSN (last 4)"}, {"key": "date_of_exam", "label": "Date of Exam", "prefill": "exam_date"}, {"key": "time_of_exam", "label": "Time of Exam", "prefill": "exam_time"}, {"key": "agency", "label": "Agency", "prefill": "organization"}, {"key": "agency_address", "label": "Agency Address", "prefill": "org_address"}], "sections": [{"title": "The Preparation", "body": "Per the documentation provided to our office, you requested _________________ be tested as part of the pre-employment screening application process for _____________________________."}, {"title": "The Pre-Test Interview Phase", "body": "Per your request, a Pre-Employment Polygraph Examination was administered to ______________, hereafter referred to as “Examinee.” The testing purpose and procedure was explained to Examinee, and Examinee consented to be interviewed and examined. Examinee reported being healthy and well-rested, and had not consumed alcohol or any illegal substances that would affect the examination.\n\nExaminee is applying for the position of __________."}, {"title": "Prior Polygraph Examination Information", "body": "Examinee has taken the following polygraph examinations prior to today’s date:\n\nMM/DD/YYYY – Agency – Examinee reported the result as “passed.”"}, {"title": "Identity / Education", "body": "Examinee was identified via a current driver’s license. Examinee reported being born in ____________. Examinee reported attending ______________ High School, graduating in ______. Examinee then attended ______________, graduating with a ______________ in ______. Examinee has never been suspended, banned or expelled from any educational institution."}, {"title": "Military History", "body": "Examinee reported never having enlisted in the United States Military."}, {"title": "First Responder Experience", "body": "Examinee reported having no first responder experience."}, {"title": "Employment History", "body": "Per the applicant polygraph screening booklet, Examinee reported the following employment history:\n\nUnless otherwise noted below, Examinee denied any disciplinary matters, theft, workplace violence, nor engaging in alcohol consumption, illegal drug use nor sexual activity at any place of employment.\n\nMM/DD/YYYY - Current: Examinee reported being employed by _______________ as a _______________.\n\nMM/DD/YYYY – MM/DD/YYYY: Examinee reported being employed by _______________ as a _______________."}, {"title": "Finances / Credits / Lawsuits", "body": "Examinee denied any prior wage garnishment, collections, delinquent tax payments, bankruptcy or anything else further remarkable to report."}, {"title": "Alcohol Consumption", "body": "Examinee reported first consuming alcohol at the age of __________. Examinee reported alcohol consumption on a (daily, weekly, monthly, social, rare) _________ basis. Examinee was last intoxicated on ______________. Examinee has never experienced a period of blacking out or memory loss due to alcohol consumption. Examinee stated never having experienced any alcohol related medical issues. Examinee reported no drinking related legal issues."}, {"title": "Illegal Drug Activity", "body": "Drug Type: First use. Last use. Frequency.\n\nExaminee denied personal use of any other illegal drugs and/or the improper use of any prescribed medication to include narcotics. Examinee further denied any sale or any profit of illegal drugs and/or narcotics; additionally, Examinee denied manufacturing, trafficking, distributing, transporting, growing or smuggling of any drugs illegally."}, {"title": "Serious Crimes", "body": "Examinee stated never having been arrested or charged with any criminal activity. Examinee reported never having engaged in any serious/felonious criminal behavior activity.\n\nExaminee reported the following misdemeanor/lesser criminal activity:\nWhat was stolen. How much was it worth. Approximate date."}, {"title": "Serious Crimes: Against Persons / Sex Crimes", "body": "During the pre-test interview it was understood between this Examiner and Examinee that a child, minor, and/or juvenile was someone under the age of eighteen. It was also understood that consensual sexual contact occurs without the use of force, excessive coercion, or the manipulation of someone who was too intoxicated to make a decision for themselves or unable to due to a mental condition. Examinee reported they understood that sexual contact between someone who held authority over another person was also non-consensual. Child pornography was defined as any depiction of sexually explicit conduct involving a minor (persons less than 18 years old) to include any photograph, film, video, picture, or computer-generated image or picture, whether made or produced by electronic, mechanical, or other means.\n\nExaminee reported the following sexual crimes:\n\nExaminee reported never having engaged in any illegal sexual behavior during their lifetime to include:\n\n- Sexual Contact with a Minor\n- Sexual Contact with Someone More Than Three Years Younger, While Still a Minor\n- Viewing, Possessing or Soliciting Child Pornography\n- Engaging in Sexual Contact Without the Consent of a Willing Partner\n- Sexual Contact with a Family Member\n- Exchanging Money for Sexual Contact\n- Sexual Contact with an Animal\n- Voyeuristic Behavior (Peeping, Exposing Oneself, Public Masturbation)\n- Sexual Conversations with a Minor After Reaching Adulthood"}, {"title": "Driving History", "body": "Examinee reported driving for _________ years and currently holds a valid __________ driver’s license.\n\nDriver’s License:\nExaminee reported the driver’s license has never been suspended.\n\nTraffic Citation/Accident:\nMM/DD/YYYY: Examinee was found guilty of _________. Examinee paid the ticket (Court Disposition).\n\nExaminee reported never having driven while under the influence of alcohol or an illegal substance."}, {"title": "Social Media", "body": "Examinee reported the following social media platforms currently or previously used by themselves or a third party on their behalf.\n\nExaminee denied the use of the internet or any social media platform for purposes of terrorist platforms, anti-government platforms, hate or bias towards any person or group, or a means to provide false, derogatory or humiliating information of a friend, coworker, supervisor, or employer."}, {"title": "Homeland Security", "body": "Examinee denied ever participating in any anti-government protest, nor ever being a member of a radical group or gang. Examinee denied ever holding any security clearance."}, {"title": "The Testing Phase", "body": "Test Objective: The relevant test questions noted below were designed to determine if Examinee appears truthful based on the information provided to this examiner.\n\nTest Procedure and Relevant Test Questions: A standardized, computerized polygraph examination was administered utilizing a standardized testing format. Noted below are the relevant-issue test questions asked during the testing phase and the Examinee’s test answers:\n\nRELEVANT: Q-1: Are you now withholding any information about your involvement with illegal drugs?\nANSWER: No\n\nRELEVANT: Q-2: Are you now concealing any information about your involvement with any serious crimes?\nANSWER: No\n\nRELEVANT: Q-3: Are you now withholding any information regarding any illegal sexual activity?\nANSWER: No\n\nRELEVANT: Q-4: Are you now purposefully falsifying or omitting any information in your polygraph booklet?\nANSWER: No"}, {"title": "The Evaluation Phase", "body": "Test Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures. The conclusion from those procedures is:\n\nNO SIGNIFICANT REACTIONS\n\nProfessional Opinion: Examinee’s answers to the relevant test questions are considered to be:\n\nNO DECEPTION INDICATED\n\n— OR (delete whichever block does not apply) —\n\nTest Results: The direct examiner evaluated the examination utilizing nationally standardized scoring procedures. The reliability of the test data was determined by additional evaluations of the charts, test questions, and scoring procedures to include a quality control process. The conclusion from those procedures is:\n\nSIGNIFICANT REACTIONS\n\nNumerical analysis of the individual Relevant Questions indicates Examinee was deceptive to Relevant Question #__, which addressed ______________________. Because of Examinee’s focus on Relevant Question #__, Examinee’s physiological responses to the remaining Relevant Questions may have been diminished or impaired and no opinion can be rendered regarding truthfulness or deception to those questions.\n\nProfessional Opinion: Examinee’s answers to the relevant test questions are considered to be:\n\nDECEPTION INDICATED"}, {"title": "The Post Test Phase", "body": "A post test interview was conducted. Examinee had no further statements or admissions. Examinee was advised that these statements and this report would be forwarded to ______________________________ after the quality control process."}], "results": ["NO SIGNIFICANT REACTIONS / NO DECEPTION INDICATED", "SIGNIFICANT REACTIONS / DECEPTION INDICATED", "INCONCLUSIVE / NO OPINION", "INCONCLUSIVE / SUSPECTED COUNTERMEASURES", "TERMINATED"], "active": true}, { id: 't1', name: 'VADOC Maintenance', test_types: ['Maintenance'], header_fields: [{ key: 'client_name', label: 'Examinee' }], sections: [{ title: 'Pre-Test Phase', body: 'Text…' }], results: ['No Deception Indicated', 'Deception Indicated'], active: true }],
}
function q(table) {
  let rows = tables[table] || []; let filters = []; let mode = 'select'; let payload = null; let one = false; let conflict = null
  const api = {
    select() { return api }, order() { return api }, limit() { return api }, range() { return api },
    eq(k, v) { filters.push((r) => r[k] === v); return api },
    neq(k, v) { filters.push((r) => r[k] !== v); return api },
    ilike(k, v) { const n = String(v).replace(/%/g, '').toLowerCase(); filters.push((r) => String(r[k] || '').toLowerCase().includes(n)); return api },
    in(k, vs) { filters.push((r) => vs.includes(r[k])); return api },
    maybeSingle() { one = 'maybe'; return api }, single() { one = true; return api },
    insert(p) { mode = 'insert'; payload = p; return api },
    upsert(p, opts) { mode = 'upsert'; payload = p; conflict = opts?.onConflict?.split(','); return api },
    update(p) { mode = 'update'; payload = p; return api },
    delete() { mode = 'delete'; return api },
    then(res) {
      let out = rows.filter((r) => filters.every((f) => f(r)))
      if (mode === 'upsert' && conflict) {
        out = []
        for (const a of [].concat(payload)) {
          let hit = (tables[table] || []).find((r) => conflict.every((k) => r[k] === a[k]))
          if (hit) Object.assign(hit, a); else { hit = { id: 'n' + Math.random().toString(36).slice(2, 7), updated_at: new Date().toISOString(), ...a }; (tables[table] ||= []).push(hit) }
          out.push({ ...hit })
        }
        mode = 'done'
      }
      if (mode === 'insert' || mode === 'upsert') { const arr = [].concat(payload); tables[table] = [...(tables[table] || []).filter((r) => !arr.some((a) => a.id && a.id === r.id)), ...arr.map((a) => ({ id: 'n' + Math.random().toString(36).slice(2, 7), ...a }))]; out = arr }
      if (mode === 'update') { out.forEach((r) => Object.assign(r, payload)) }
      if (mode === 'delete') { tables[table] = rows.filter((r) => !out.includes(r)) }
      const data = one ? (out[0] ?? null) : out
      res({ data, error: null })
    },
  }
  return api
}
export const supabase = {
  from: q,
  rpc: async () => ({ data: null, error: null }),
  auth: {
    getSession: async () => ({ data: { session: { user: who } } }),
    getUser: async () => ({ data: { user: who } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    updateUser: async ({ password }) => ({ error: password === 'fail' ? { message: 'boom' } : null }),
    signOut: async () => ({ error: null }),
  },
}
