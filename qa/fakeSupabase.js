// In-memory Supabase stand-in for UI smoke tests (no network in the sandbox).
const ADMIN = { id: 'u-admin', email: 'qa@sapps.test', user_metadata: { name: 'QA Admin' } }
const EXAMINER = { id: 'u-brad', email: 'bdhhwt@gmail.com', user_metadata: { name: 'Brad Hughes' } }
const who = (typeof window !== 'undefined' && window.__QA_ROLE === 'examiner') ? EXAMINER : ADMIN
const d = (n) => { const t = new Date(); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10) }
const ym = new Date().toISOString().slice(0, 7)
const tables = {
  users: [
    { id: 'u-admin', email: 'qa@sapps.test', name: 'QA Admin', role: 'payroll_admin', active: true, is_examiner: false, must_change_password: false },
    { id: 'u-brad', email: 'bdhhwt@gmail.com', name: 'Brad Hughes', role: 'examiner', active: true, is_examiner: true, must_change_password: true },
    { id: 'u-al', email: 'amoorepoly@yahoo.com', name: 'Al Moore', role: 'examiner', active: true, is_examiner: true, must_change_password: false },
  ],
  exams: [
    { id: 'e1', client_name: 'T. Boyd', exam_date: d(-9), exam_time: '13:00', exam_type: 'Maintenance', organization: 'Manassas', duration_minutes: 90, status: 'completed', examiner_id: 'u-brad' },
    { id: 'e2', client_name: 'M. Ruiz', exam_date: d(-8), exam_time: '10:00', exam_type: 'Sexual History', organization: 'Manassas', duration_minutes: 90, status: 'completed', examiner_id: 'u-brad' },
    { id: 'e3', client_name: 'K. Lane', exam_date: d(-3), exam_time: '09:00', exam_type: null, organization: 'Winchester', duration_minutes: 90, status: 'scheduled', examiner_id: 'u-brad' },
    { id: 'e4', client_name: 'R. Diaz', exam_date: d(2), exam_time: '11:00', exam_type: null, organization: 'Charlottesville', duration_minutes: 90, status: 'scheduled', examiner_id: 'u-al' },
    { id: 'e5', client_name: 'A. Boyden', exam_date: d(-12), exam_time: '09:00', exam_type: 'Pre-Employment No Show', organization: 'Virginia Center for Behavioral Rehabilitation', duration_minutes: 60, status: 'completed', examiner_id: 'u-al' },
  ],
  intake_forms: [
    { exam_id: 'e1', copay_amount: 25, amount_due_examiner: 125, amount_due_sapps: 25, status: 'submitted' },
    { exam_id: 'e2', copay_amount: 0, amount_due_examiner: 150, amount_due_sapps: 25, status: 'submitted' },
    { exam_id: 'e5', copay_amount: 0, amount_due_examiner: 0, amount_due_sapps: 100, status: 'submitted' },
  ],
  invoices: [], org_pos: [{ organization: 'Virginia Center for Behavioral Rehabilitation', po_number: 'PO-44821' }], invoice_details: [],
  week_submissions: [], reports: [
    { id: 'r1', exam_id: 'e1', examiner_id: 'u-brad', examiner_name: 'Brad Hughes', client_name: 'T. Boyd', organization: 'Manassas', exam_date: d(-9), exam_type: 'Maintenance', status: 'final', header: {}, sections: [], result: 'No Deception Indicated' },
  ],
  report_templates: [{ id: 't1', name: 'VADOC Maintenance', test_types: ['Maintenance'], header_fields: [{ key: 'client_name', label: 'Examinee' }], sections: [{ title: 'Pre-Test Phase', body: 'Text…' }], results: ['No Deception Indicated', 'Deception Indicated'], active: true }],
}
function q(table) {
  let rows = tables[table] || []; let filters = []; let mode = 'select'; let payload = null; let one = false
  const api = {
    select() { return api }, order() { return api }, limit() { return api },
    eq(k, v) { filters.push((r) => r[k] === v); return api },
    in(k, vs) { filters.push((r) => vs.includes(r[k])); return api },
    maybeSingle() { one = 'maybe'; return api }, single() { one = true; return api },
    insert(p) { mode = 'insert'; payload = p; return api },
    upsert(p) { mode = 'upsert'; payload = p; return api },
    update(p) { mode = 'update'; payload = p; return api },
    delete() { mode = 'delete'; return api },
    then(res) {
      let out = rows.filter((r) => filters.every((f) => f(r)))
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
