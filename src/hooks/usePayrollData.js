import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeMonthClose } from '../lib/monthClose'
import { fetchAll } from '../lib/fetchAll'
import { normalizeIntake, examAmountOf, copayOf, billedOf, commissionOf, officeUseOf, examinerNetOf } from '../lib/amounts'

// --- CSV helpers (no deps; plain Blob download) ---
function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
const money = (n) => (Number(n) || 0).toFixed(2)
const today = () => {
  const d = new Date() // local date, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Month-centric payroll data. `month` is 'YYYY-MM'; everything the page
// shows — examiner status, submissions, exports — is scoped to it.
export function usePayrollData(month) {
  const [submissions, setSubmissions] = useState([])
  const [exams, setExams] = useState([])
  const [intakeByExam, setIntakeByExam] = useState({})
  const [userName, setUserName] = useState({})
  const [examiners, setExaminers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [subRes, examRes, intakeRes, userRes] = await Promise.all([
      fetchAll(() => supabase
        .from('week_submissions')
        .select('id, examiner_id, examiner_name, week_start, week_end, total_exams, completed_exams, total_revenue, total_net, submitted_at, submitted_by')
        .order('submitted_at', { ascending: false })
        .order('id')),
      fetchAll(() => supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_time, exam_type, organization, status, examiner_id, duration_minutes')
        .order('id')),
      fetchAll(() => supabase
        .from('intake_forms')
        .select('exam_id, exam_amount, copay_amount, amount_due_examiner, amount_due_sapps, submitted_at')
        .order('exam_id')),
      supabase
        .from('users')
        .select('id, name, email, role, active, is_examiner'),
    ])
    if (subRes.error) setError(subRes.error.message)

    const typeOf = {}
    for (const e of examRes.data || []) typeOf[e.id] = e.exam_type
    const intakeMap = {}
    for (const r of intakeRes.data || []) intakeMap[r.exam_id] = normalizeIntake(r, typeOf[r.exam_id])
    const nameMap = {}
    for (const u of userRes.data || []) nameMap[u.id] = u.name

    setSubmissions(subRes.data || [])
    setExams(examRes.data || [])
    setIntakeByExam(intakeMap)
    setUserName(nameMap)
    setExaminers((userRes.data || []).filter((u) => u.is_examiner && u.active))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // The heart of the page: who's in, who's outstanding, for this month.
  const monthClose = useMemo(
    () => computeMonthClose({ exams, submissions, examiners, month }),
    [exams, submissions, examiners, month]
  )

  // Submissions whose week touches the selected month (weeks can straddle
  // month boundaries, so match on overlap rather than week_start prefix).
  const monthSubmissions = useMemo(() => {
    const first = `${month}-01`
    const last = `${month}-31` // string compare; safe for ISO dates
    return submissions.filter((s) => s.week_start <= last && s.week_end >= first)
  }, [submissions, month])

  const monthExams = useMemo(
    () => exams.filter((e) => (e.exam_date || '').startsWith(month)),
    [exams, month]
  )

  function exportSummaryCsv() {
    const header = ['Examiner', 'Week Start', 'Week End', 'Completed', 'Total Exams', 'Exam Amounts (as submitted)', 'Examiner Net Pay (as submitted)', 'Submitted']
    const rows = monthSubmissions.map((s) => [
      s.examiner_name, s.week_start, s.week_end, s.completed_exams, s.total_exams,
      money(s.total_revenue), s.total_net == null ? '' : money(s.total_net),
      s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '',
    ])
    downloadCsv(`sapps-${month}-week-summary-${today()}.csv`, [header, ...rows])
  }

  function exportDetailedCsv() {
    const header = ['Date', 'Time', 'Examiner', 'Examinee', 'Exam Type', 'Organization', 'Status', 'Exam Amount', 'Copay', 'Billed to Client', 'Commission', 'Office Use', 'Examiner Net Pay', 'Financials Submitted']
    const rows = [...monthExams]
      .sort((a, b) => (a.exam_date + a.exam_time).localeCompare(b.exam_date + b.exam_time))
      .map((e) => {
        const f = intakeByExam[e.id]
        // Exams without financials yet export blank amounts, not $0.00.
        const cell = (fn) => (f ? money(fn(f)) : '')
        return [
          e.exam_date, (e.exam_time || '').slice(0, 5),
          userName[e.examiner_id] || 'Unassigned',
          e.client_name, e.exam_type, e.organization, e.status,
          cell(examAmountOf), cell(copayOf), cell(billedOf),
          cell(commissionOf), cell(officeUseOf), cell(examinerNetOf),
          f?.submitted_at ? new Date(f.submitted_at).toLocaleString() : '',
        ]
      })
    downloadCsv(`sapps-${month}-detailed-${today()}.csv`, [header, ...rows])
  }

  return {
    monthClose,
    monthSubmissions,
    loading, error, refetch: load,
    exportSummaryCsv, exportDetailedCsv,
    hasMonthExams: monthExams.length > 0,
  }
}
