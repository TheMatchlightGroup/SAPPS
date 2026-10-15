import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeMonthClose } from '../lib/monthClose'
import { fetchAll } from '../lib/fetchAll'
import { timeRange } from '../lib/privateBlocks'
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
  const [privateBlocks, setPrivateBlocks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [subRes, examRes, intakeRes, userRes, privRes] = await Promise.all([
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
        .select('id, name, email, role, active, is_examiner, private_office_fee'),
      fetchAll(() => supabase
        .from('private_blocks')
        .select('id, examiner_id, block_date, start_time, duration_minutes, at_office, office_fee, note, deducted_at, deducted_by')
        .order('block_date')
        .order('id')),
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
    setUsers(userRes.data || [])
    setPrivateBlocks(privRes.data || [])
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

  // ---- Private office use (10/15) ----
  // One group per examiner who has a fee on file or logged office use this
  // month. `owed` = not yet marked deducted.
  const monthPrivate = useMemo(() => {
    const inMonth = privateBlocks.filter((b) => b.at_office && (b.block_date || '').startsWith(month))
    const byEx = {}
    for (const u of users) if (u.is_examiner && u.active && u.private_office_fee != null) byEx[u.id] = []
    for (const b of inMonth) (byEx[b.examiner_id] ||= []).push(b)
    return Object.entries(byEx).map(([id, blocks]) => {
      const u = users.find((x) => x.id === id) || {}
      blocks.sort((a, b) => (a.block_date + a.start_time).localeCompare(b.block_date + b.start_time))
      // Only exams that have happened are owed; future ones show as upcoming.
      const owedBlocks = blocks.filter((b) => !b.deducted_at && b.block_date <= today())
      return {
        id, name: u.name || 'Unknown', email: u.email || '', rate: u.private_office_fee,
        blocks,
        total: blocks.reduce((n, b) => n + (Number(b.office_fee) || 0), 0),
        owed: owedBlocks.reduce((n, b) => n + (Number(b.office_fee) || 0), 0),
        owedIds: owedBlocks.map((b) => b.id),
        deductedIds: blocks.filter((b) => b.deducted_at).map((b) => b.id),
        upcoming: blocks.filter((b) => !b.deducted_at && b.block_date > today()).length,
      }
    }).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name))
  }, [privateBlocks, users, month])

  const markDeducted = useCallback(async (ids, on = true) => {
    if (!ids.length) return { error: null }
    const who = (await supabase.auth.getUser())?.data?.user?.email ?? null
    const { error: e } = await supabase.from('private_blocks')
      .update(on ? { deducted_at: new Date().toISOString(), deducted_by: who } : { deducted_at: null, deducted_by: null })
      .in('id', ids)
    if (e) return { error: e.message }
    await load()
    return { error: null }
  }, [load])

  const setOfficeRate = useCallback(async (userId, fee) => {
    const v = fee === '' || fee === null ? null : Number(fee)
    if (v !== null && (Number.isNaN(v) || v < 0)) return { error: 'Fee must be $0 or more.' }
    const { error: e } = await supabase.from('users').update({ private_office_fee: v }).eq('id', userId)
    if (e) return { error: e.message }
    await load()
    return { error: null }
  }, [load])

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
    // Private exams at the office: one row each, fee in the Office Use
    // column and as a negative net so the deduction can't be missed.
    const nameOf = Object.fromEntries(users.map((u) => [u.id, u.name]))
    const privRows = privateBlocks
      .filter((b) => b.at_office && (b.block_date || '').startsWith(month))
      .sort((a, b) => (a.block_date + a.start_time).localeCompare(b.block_date + b.start_time))
      .map((b) => [
        b.block_date, (b.start_time || '').slice(0, 5), nameOf[b.examiner_id] || 'Unknown',
        'Private exam', 'Private (office use)', timeRange(b.start_time, b.duration_minutes),
        b.deducted_at ? 'deducted' : 'to deduct',
        '', '', '', '', money(b.office_fee), money(-(Number(b.office_fee) || 0)),
        b.deducted_at ? new Date(b.deducted_at).toLocaleString() : '',
      ])
    downloadCsv(`sapps-${month}-detailed-${today()}.csv`, [header, ...rows, ...privRows])
  }

  return {
    monthClose,
    monthSubmissions,
    loading, error, refetch: load,
    exportSummaryCsv, exportDetailedCsv,
    hasMonthExams: monthExams.length > 0,
    monthPrivate, markDeducted, setOfficeRate,
  }
}
