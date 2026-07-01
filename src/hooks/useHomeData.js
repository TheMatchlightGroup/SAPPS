import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const thisMonth = () => new Date().toISOString().slice(0, 7)
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Lightweight counts for the Today screen. Reads are RLS-gated to
// payroll_admin, which is the only role that sees this page.
export function useHomeData() {
  const [state, setState] = useState({
    readyToInvoice: 0, invoiced: 0, totalOrgs: 0, weeks: 0, loading: true,
  })

  const load = useCallback(async () => {
    const month = thisMonth()
    const [examRes, invRes, weekRes] = await Promise.all([
      supabase.from('exams').select('organization, exam_date').eq('status', 'completed'),
      supabase.from('invoices').select('organization, month'),
      supabase.from('week_submissions').select('id, week_start'),
    ])

    const monthExams = (examRes.data || []).filter((e) => (e.exam_date || '').startsWith(month))
    const orgs = [...new Set(monthExams.map((e) => e.organization))]
    const sent = new Set((invRes.data || []).filter((r) => r.month === month).map((r) => r.organization))
    const invoiced = orgs.filter((o) => sent.has(o)).length
    const weeks = (weekRes.data || []).filter((w) => (w.week_start || '').startsWith(month)).length

    setState({
      readyToInvoice: orgs.length - invoiced,
      invoiced,
      totalOrgs: orgs.length,
      weeks,
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
