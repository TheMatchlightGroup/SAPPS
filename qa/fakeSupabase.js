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
  invoices: [], org_pos: [{ organization: 'Virginia Center for Behavioral Rehabilitation', po_number: 'PO-44821' }], invoice_details: [],
  week_submissions: [], reports: [
    { id: 'r1', exam_id: 'e1', examiner_id: 'u-brad', examiner_name: 'Brad Hughes', client_name: 'T. Boyd', organization: 'Manassas', exam_date: d(-9), exam_type: 'Maintenance', status: 'final', header: {}, sections: [], result: 'No Deception Indicated' },
  ],
  report_templates: [{ id: 't1', name: 'VADOC Maintenance', test_types: ['Maintenance'], header_fields: [{ key: 'client_name', label: 'Examinee' }], sections: [{ title: 'Pre-Test Phase', body: 'Text…' }], results: ['No Deception Indicated', 'Deception Indicated'], active: true }],
}
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
