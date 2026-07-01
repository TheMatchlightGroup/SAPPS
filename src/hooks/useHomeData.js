import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeMonthClose } from '../lib/monthClose'

const thisMonth = () => new Date().toISOString().slice(0, 7)
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Counts for the Today screen. Reads are RLS-gated to payroll_admin,
// which is the only role that sees this page.
export function useHomeData() {
  const [state, setState] = useState({
    readyToInvoice: 0, invoiced: 0, totalOrgs: 0, weeks: 0,
    payrollOutstanding: 0, payrollHasWork: false, payrollAllIn: false,
    loading: true,
  })

  const load = useCallback(async () => {
    const month = thisMonth()
    const [examRes, invRes, weekRes, userRes] = await Promise.all([
      supabase.from('exams').select('id, client_name, organization, exam_date, status, examiner_id'),
      supabase.from('invoices').select('organization, month'),
      supabase.from('week_submissions').select('id, examiner_id, week_start, week_end'),
      supabase.from('users').select('id, name, email, role, active'),
    ])

    const exams = examRes.data || []
    const monthCompleted = exams.filter(
      (e) => e.status === 'completed' && (e.exam_date || '').startsWith(month)
    )
    const orgs = [...new Set(monthCompleted.map((e) => e.organization))]
    const sent = new Set((invRes.data || []).filter((r) => r.month === month).map((r) => r.organization))
    const invoiced = orgs.filter((o) => sent.has(o)).length
    const weeks = (weekRes.data || []).filter((w) => (w.week_start || '').startsWith(month)).length

    const examiners = (userRes.data || []).filter((u) => u.role === 'examiner' && u.active)
    const close = computeMonthClose({
      exams,
      submissions: weekRes.data || [],
      examiners,
      month,
    })

    setState({
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
