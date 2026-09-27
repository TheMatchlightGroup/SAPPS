// Demo data for training screenshots — real SAPPS staff, FICTIONAL examinees.
const role = typeof window !== 'undefined' ? window.__QA_ROLE : null
const U = {
  cris: { id: 'u-cris', email: 'crissmithpolygraph@gmail.com', user_metadata: { name: 'Cris Smith' } },
  brad: { id: 'u-brad', email: 'bdhhwt@gmail.com', user_metadata: { name: 'Brad Hughes' } },
  al: { id: 'u-al', email: 'amoorepoly@yahoo.com', user_metadata: { name: 'Al Moore' } },
}
const who = role === 'examiner' ? U.al : role === 'team_lead' ? U.brad : U.cris
const tables = {
  users: [
    { id: 'u-cris', email: 'crissmithpolygraph@gmail.com', name: 'Cris Smith', role: 'payroll_admin', color: '#2A9D8F', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-rob', email: 'rjsmithpolygraph@gmail.com', name: 'Robert Smith', role: 'payroll_admin', color: '#D0613F', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-brad', email: 'bdhhwt@gmail.com', name: 'Brad Hughes', role: 'team_lead', color: '#4A86D6', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-marc', email: 'marcbmitchell@gmail.com', name: 'Marc Mitchell', role: 'examiner', color: '#CF5A83', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-kat', email: 'polygraphprofessionalservices@gmail.com', name: 'Kat Manning', role: 'examiner', color: '#8B6CC9', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-nate', email: 'nate.perkins@polyassessment.com', name: 'Nate Perkins', role: 'examiner', color: '#5E8A2E', active: true, is_examiner: true, must_change_password: false },
    { id: 'u-al', email: 'amoorepoly@yahoo.com', name: 'Al Moore', role: 'examiner', color: '#A5539F', active: true, is_examiner: true, must_change_password: false },
  ],
  exams: [],
  intake_forms: [],
  examiner_availability: [],
  week_submissions: [], invoices: [], invoice_details: [], org_pos: [],
  reports: [],
  report_templates: [{ id: 't1', name: 'Pre-Employment Report', test_types: ['Pre-Employment'], header_fields: [{ key: 'name', label: 'Name', prefill: 'client_name' }, { key: 'date_of_exam', label: 'Date of Exam', prefill: 'exam_date' }], sections: [{ title: 'Pre-Test Interview', body: '' }], results: ['NO SIGNIFICANT REACTIONS / TRUTHFUL', 'SIGNIFICANT REACTIONS / UNTRUTHFUL', 'INCONCLUSIVE / NO OPINION'], active: true }],
}
// ---- exams (fictional examinees) ----
const X = (id, date, time, name, org, examiner, type = null, status = 'scheduled') =>
  tables.exams.push({ id, client_name: name, exam_date: date, exam_time: time, exam_type: type, organization: org, duration_minutes: 120, status, examiner_id: examiner })
const ACFR = 'Arlington County Fire & Rescue', PWCFR = 'Prince William County Fire & Rescue', FAUQ = 'Fauquier County Fire & Rescue', LCFR = 'Loudoun Fire & Rescue', FCPD = 'Fairfax City Police Department', PWAD = 'Prince William Adult Detention Center'
X('d1', '2026-09-08', '09:00', 'J. Carter', ACFR, 'u-cris', 'Pre-Employment', 'completed')
X('d2', '2026-09-10', '13:00', 'L. Nguyen', PWCFR, 'u-marc', 'Pre-Employment', 'completed')
X('d3', '2026-09-15', '09:00', 'R. Alvarez', FAUQ, 'u-brad', 'Pre-Employment', 'completed')
X('d4', '2026-09-17', '10:00', 'T. Brooks', 'Winchester', 'u-al', 'Maintenance', 'completed')
X('d5', '2026-09-22', '09:00', 'M. Patel', ACFR, 'u-al', 'Pre-Employment', 'completed')
X('d6', '2026-09-23', '13:00', 'S. Owens', LCFR, 'u-kat', 'Pre-Employment', 'completed')
X('d7', '2026-09-24', '09:00', 'D. Fischer', PWCFR, 'u-marc', 'Pre-Employment', 'completed')
X('d8', '2026-09-25', '10:00', 'K. Ramos', FCPD, 'u-al')
X('d9', '2026-09-28', '09:00', 'A. Whitaker', ACFR, 'u-brad')
X('d10', '2026-09-28', '13:00', 'B. Sullivan', PWCFR, 'u-marc')
X('d11', '2026-09-29', '08:30', 'C. Donovan', ACFR, 'u-cris')
X('d12', '2026-09-29', '10:00', 'E. Kim', ACFR, 'u-brad')
X('d13', '2026-09-29', '11:30', 'F. Morales', PWCFR, 'u-al')
X('d14', '2026-09-29', '13:00', 'G. Hayes', FAUQ, 'u-kat')
X('d15', '2026-09-29', '14:30', 'H. Lawson', LCFR, 'u-nate')
X('d16', '2026-09-29', '16:00', 'I. Grant', PWAD, 'u-marc')
X('d17', '2026-09-30', '09:00', 'N. Porter', ACFR, 'u-al')
X('d18', '2026-10-01', '10:00', 'P. Reyes', FCPD, 'u-kat')
X('d19', '2026-10-02', '09:00', 'Q. Bennett', PWCFR, 'u-nate')
X('d20', '2026-09-18', '09:00', 'V. Chen', 'Charlottesville', 'u-nate', 'Monitoring', 'completed')
const I = (exam_id, exam_amount, copay, comm, office) => tables.intake_forms.push({ exam_id, exam_amount, copay_amount: copay, amount_due_examiner: comm, amount_due_sapps: office, status: 'submitted', submitted_at: '2026-09-25T15:00:00Z' })
I('d1', 225, 0, 175, 0); I('d2', 225, 0, 175, 30); I('d3', 225, 0, 175, 0); I('d4', 225, 50, 175, 0)
I('d5', 225, 0, 175, 30); I('d6', 225, 0, 175, 0); I('d7', 225, 0, 175, 30); I('d20', 225, 75, 175, 0)
tables.reports.push({ id: 'r1', exam_id: 'd5', examiner_id: 'u-al', examiner_name: 'Al Moore', client_name: 'M. Patel', organization: ACFR, exam_date: '2026-09-22', exam_type: 'Pre-Employment', status: 'final', header: {}, sections: [], result: '' })
// ---- availability painted for the week ahead ----
const A = (examiner_id, dates, note = null) => dates.forEach((date) => tables.examiner_availability.push({ examiner_id, date, note }))
const wk = (dd) => dd.map((d) => `2026-${d}`)
A('u-cris', wk(['09-28', '09-29', '09-30', '10-01', '10-02', '09-21', '09-22', '09-23', '09-24', '09-25']))
A('u-brad', wk(['09-28', '09-29', '10-01', '09-21', '09-23', '09-25']))
A('u-marc', wk(['09-28', '09-29', '09-30', '09-22', '09-24']))
A('u-kat', wk(['09-29', '10-01', '09-23']))
A('u-nate', wk(['09-29', '10-02', '09-22', '09-25']))
A('u-al', wk(['09-29', '09-30', '09-22', '09-25']))
A('u-al', wk(['10-02']), 'AM only')
A('u-brad', wk(['09-30']), 'Fairfax office')
function q(table) {
  let rows = tables[table] || []; let filters = []; let mode = 'select'; let payload = null; let one = false; let conflict = null
  const api = {
    select() { return api }, order() { return api }, limit() { return api }, range() { return api },
    eq(k, v) { filters.push((r) => r[k] === v); return api },
    in(k, vs) { filters.push((r) => vs.includes(r[k])); return api },
    maybeSingle() { one = 'maybe'; return api }, single() { one = true; return api },
    insert(p) { mode = 'insert'; payload = p; return api },
    upsert(p, opts) { mode = 'upsert'; payload = p; conflict = opts?.onConflict?.split(','); return api },
    update(p) { mode = 'update'; payload = p; return api },
    delete() { mode = 'delete'; return api },
    then(res) {
      let out = rows.filter((r) => filters.every((f) => f(r)))
      if (mode === 'upsert' && conflict) {
        for (const a of [].concat(payload)) {
          const hit = (tables[table] || []).find((r) => conflict.every((k) => r[k] === a[k]))
          if (hit) Object.assign(hit, a); else (tables[table] ||= []).push({ id: 'n' + Math.random().toString(36).slice(2, 7), ...a })
        }
        out = [].concat(payload); mode = 'done'
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
