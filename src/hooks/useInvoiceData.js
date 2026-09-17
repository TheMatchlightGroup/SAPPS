import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeMonthClose } from '../lib/monthClose'

// Loads exams + their financials, plus the `invoices` table so the worklist
// knows what's already been sent. Amount of Exam = examiner commission +
// office use (the price the examiner entered); Copay is what the examinee
// paid; Total Due from the org = Amount - Copay.
//
// Also loads examiners + week submissions so the worklist can warn when
// payroll data for the month isn't fully in yet (exams could still arrive).
export function useInvoiceData() {
  const [allExams, setAllExams] = useState([])       // every status — for the payroll check
  const [exams, setExams] = useState([])             // completed only — invoice lines
  const [intakeByExam, setIntakeByExam] = useState({})
  const [sentByKey, setSentByKey] = useState({})     // `${organization}__${month}` -> invoice row
  const [poByOrg, setPoByOrg] = useState({})         // organization -> saved PO number
  const [detailsByKey, setDetailsByKey] = useState({}) // `${organization}__${month}` -> header overrides
  const [submissions, setSubmissions] = useState([])
  const [examiners, setExaminers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [examRes, intakeRes, invRes, weekRes, userRes, poRes, detRes] = await Promise.all([
      supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_type, organization, status, examiner_id')
        .order('exam_date', { ascending: true }),
      supabase
        .from('intake_forms')
        .select('exam_id, copay_amount, amount_due_examiner, amount_due_sapps'),
      supabase
        .from('invoices')
        .select('id, organization, month, invoice_no, method, sent_at, sent_by'),
      supabase
        .from('week_submissions')
        .select('examiner_id, week_start, week_end'),
      supabase
        .from('users')
        .select('id, name, email, role, active, is_examiner'),
      supabase
        .from('org_pos')
        .select('organization, po_number'),
      supabase
        .from('invoice_details')
        .select('organization, month, invoice_no, services_label, invoice_date'),
    ])
    if (examRes.error) setError(examRes.error.message)

    const map = {}
    for (const r of intakeRes.data || []) map[r.exam_id] = r

    const sent = {}
    for (const r of invRes.data || []) sent[`${r.organization}__${r.month}`] = r

    const pos = {}
    for (const r of poRes.data || []) pos[r.organization] = r.po_number

    const det = {}
    for (const r of detRes.data || []) det[`${r.organization}__${r.month}`] = r

    const all = examRes.data || []
    setAllExams(all)
    setExams(all.filter((e) => e.status === 'completed'))
    setIntakeByExam(map)
    setSentByKey(sent)
    setPoByOrg(pos)
    setDetailsByKey(det)
    setSubmissions(weekRes.data || [])
    setExaminers((userRes.data || []).filter((u) => u.is_examiner && u.active))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Organizations that actually have completed exams (for the picker).
  const billableOrgs = [...new Set(exams.map((e) => e.organization))].sort()

  // Payroll month-close status — used for the "totals may still grow" note.
  const monthCloseFor = useCallback(
    (month) => computeMonthClose({ exams: allExams, submissions, examiners, month }),
    [allExams, submissions, examiners]
  )

  // The invoice row for an org+month, or null if it hasn't been sent.
  const sentStatus = useCallback(
    (organization, month) => sentByKey[`${organization}__${month}`] || null,
    [sentByKey]
  )

  // Record (or update) that an org's monthly invoice was sent. Unique on
  // (organization, month), so re-sending updates the existing row instead of
  // duplicating it.
  async function markInvoiceSent({ organization, month, invoice_no, method }) {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('invoices').upsert(
      {
        organization,
        month,
        invoice_no,
        method,
        sent_at: new Date().toISOString(),
        sent_by: u?.user?.email ?? null,
      },
      { onConflict: 'organization,month' }
    )
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  // Saved PO number for an org ('' if none). POs persist per organization —
  // enter it once, it appears on every invoice for that client until changed.
  const poFor = useCallback((organization) => poByOrg[organization] || '', [poByOrg])

  // Save (or clear, when blank) the org's PO number. Blank deletes the row so
  // the PO line disappears from the printed invoice entirely.
  async function savePo(organization, poNumber) {
    const trimmed = (poNumber || '').trim()
    if (!trimmed) {
      const { error } = await supabase.from('org_pos').delete().eq('organization', organization)
      if (error) return { error: error.message }
    } else {
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('org_pos').upsert(
        {
          organization,
          po_number: trimmed,
          updated_at: new Date().toISOString(),
          updated_by: u?.user?.email ?? null,
        },
        { onConflict: 'organization' }
      )
      if (error) return { error: error.message }
    }
    setPoByOrg((m) => {
      const next = { ...m }
      if (trimmed) next[organization] = trimmed
      else delete next[organization]
      return next
    })
    return { error: null }
  }

  // Header overrides (invoice #, month-of-services label, invoice date) for
  // one org+month. Null fields mean "use the app's default".
  const detailsFor = useCallback(
    (organization, month) => detailsByKey[`${organization}__${month}`] || null,
    [detailsByKey]
  )

  // Save header overrides. Pass only the fields being set; blank strings clear
  // a field back to the default. Upsert on (organization, month).
  async function saveDetails({ organization, month, invoice_no, services_label, invoice_date }) {
    const { data: u } = await supabase.auth.getUser()
    const row = {
      organization,
      month,
      invoice_no: (invoice_no || '').trim() || null,
      services_label: (services_label || '').trim() || null,
      invoice_date: invoice_date || null,
      updated_at: new Date().toISOString(),
      updated_by: u?.user?.email ?? null,
    }
    const { error } = await supabase.from('invoice_details').upsert(row, { onConflict: 'organization,month' })
    if (error) return { error: error.message }
    setDetailsByKey((m) => ({ ...m, [`${organization}__${month}`]: row }))
    return { error: null }
  }

  // Undo a "sent" mark (mistakes happen).
  async function unmarkInvoiceSent({ organization, month }) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('organization', organization)
      .eq('month', month)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  return {
    exams, intakeByExam, billableOrgs, loading, error, refetch: load,
    sentStatus, markInvoiceSent, unmarkInvoiceSent, monthCloseFor,
    poFor, savePo, detailsFor, saveDetails,
  }
}
