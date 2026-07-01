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
  const [submissions, setSubmissions] = useState([])
  const [examiners, setExaminers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [examRes, intakeRes, invRes, weekRes, userRes] = await Promise.all([
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
        .select('id, name, email, role, active'),
    ])
    if (examRes.error) setError(examRes.error.message)

    const map = {}
    for (const r of intakeRes.data || []) map[r.exam_id] = r

    const sent = {}
    for (const r of invRes.data || []) sent[`${r.organization}__${r.month}`] = r

    const all = examRes.data || []
    setAllExams(all)
    setExams(all.filter((e) => e.status === 'completed'))
    setIntakeByExam(map)
    setSentByKey(sent)
    setSubmissions(weekRes.data || [])
    setExaminers((userRes.data || []).filter((u) => u.role === 'examiner' && u.active))
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
  }
}
