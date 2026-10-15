import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeMonthClose } from '../lib/monthClose'
import { fetchAll } from '../lib/fetchAll'

const thisMonth = () => {
  const d = new Date() // local month, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Counts for the Today screen. Reads are RLS-gated to payroll_admin,
// which is the only role that sees this page.
export function useHomeData() {
  const [state, setState] = useState({
    readyToInvoice: 0, invoiced: 0, totalOrgs: 0, weeks: 0,
    payrollOutstanding: 0, payrollHasWork: false, payrollAllIn: false,
    privateOwed: 0, privateOwedCount: 0,
    loading: true,
  })

  const load = useCallback(async () => {
    const month = thisMonth()
    const [examRes, invRes, weekRes, userRes, privRes] = await Promise.all([
      fetchAll(() => supabase.from('exams').select('id, client_name, organization, exam_date, status, examiner_id').order('id')),
      supabase.from('invoices').select('organization, month'),
      supabase.from('week_submissions').select('id, examiner_id, week_start, week_end'),
      supabase.from('users').select('id, name, email, role, active, is_examiner'),
      // Private office fees not yet deducted (any month, up to today).
      fetchAll(() => supabase.from('private_blocks').select('id, block_date, start_time, office_fee, at_office, deducted_at').order('id')),
    ])

    const exams = examRes.data || []
    const monthCompleted = exams.filter(
      (e) => e.status === 'completed' && (e.exam_date || '').startsWith(month)
    )
    const orgs = [...new Set(monthCompleted.map((e) => e.organization))]
    const sent = new Set((invRes.data || []).filter((r) => r.month === month).map((r) => r.organization))
    const invoiced = orgs.filter((o) => sent.has(o)).length
    const weeks = (weekRes.data || []).filter((w) => (w.week_start || '').startsWith(month)).length

    const examiners = (userRes.data || []).filter((u) => u.is_examiner && u.active)
    const close = computeMonthClose({
      exams,
      submissions: weekRes.data || [],
      examiners,
      month,
    })

    const d = new Date()
    const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    // Started, not deducted, at the office. A fee of NULL ("not set yet")
    // still counts as an exam to deal with.
    const nowKey = `${todayISO}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const owed = (privRes.data || []).filter((b) => b.at_office && !b.deducted_at && `${b.block_date}T${String(b.start_time || '').slice(0, 5)}` <= nowKey && (b.office_fee == null || Number(b.office_fee) > 0))

    setState({
      privateOwed: owed.reduce((n, b) => n + (Number(b.office_fee) || 0), 0),
      privateOwedCount: owed.length,
      readyToInvoice: orgs.length - invoiced,
      invoiced,
      totalOrgs: orgs.length,
      weeks,
      payrollOutstanding: close.outstanding.length,
      payrollHasWork: close.hasWork,
      payrollAllIn: close.allIn,
      loading: false,
    })
  }, [])

  useEffect(() => { load() }, [load])

  return {
    ...state,
    month: thisMonth(),
    monthName: MONTHS[Number(thisMonth().slice(5, 7))],
    refetch: load,
  }
}
