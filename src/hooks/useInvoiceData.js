import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Loads completed exams + their financials. The page slices these by
// organization + month to build an invoice. Amount of Exam = examiner
// commission + office use (the price the examiner entered); Copay is what the
// examinee paid; Total Due from the org = Amount - Copay.
export function useInvoiceData() {
  const [exams, setExams] = useState([])
  const [intakeByExam, setIntakeByExam] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [examRes, intakeRes] = await Promise.all([
      supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_type, organization, status')
        .eq('status', 'completed')
        .order('exam_date', { ascending: true }),
      supabase
        .from('intake_forms')
        .select('exam_id, copay_amount, amount_due_examiner, amount_due_sapps'),
    ])
    if (examRes.error) setError(examRes.error.message)
    const map = {}
    for (const r of intakeRes.data || []) map[r.exam_id] = r
    setExams(examRes.data || [])
    setIntakeByExam(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Organizations that actually have completed exams (for the picker).
  const billableOrgs = [...new Set(exams.map((e) => e.organization))].sort()

  return { exams, intakeByExam, billableOrgs, loading, error, refetch: load }
}
