import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Central data layer: exams, examiner roster, financials (intake_forms),
// and week submissions. RLS decides who sees and does what.
export function useCalendarData() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [examiners, setExaminers] = useState([])
  const [intakeByExam, setIntakeByExam] = useState({})
  const [weekSubmissions, setWeekSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [examRes, examinerRes, intakeRes, weekRes] = await Promise.all([
      supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_time, exam_type, organization, duration_minutes, status, examiner_id')
        .order('exam_date', { ascending: true })
        .order('exam_time', { ascending: true }),
      supabase
        .from('users')
        .select('id, name')
        .eq('role', 'examiner')
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('intake_forms')
        .select('exam_id, copay_amount, amount_due_examiner, amount_due_sapps'),
      supabase
        .from('week_submissions')
        .select('id, examiner_id, examiner_name, week_start, week_end, total_exams, completed_exams, total_revenue, submitted_at')
        .order('week_start', { ascending: false }),
    ])
    if (examRes.error) setError(examRes.error.message)

    const intakeMap = {}
    for (const row of intakeRes.data || []) intakeMap[row.exam_id] = row

    setExams(examRes.data || [])
    setExaminers(examinerRes.data || [])
    setIntakeByExam(intakeMap)
    setWeekSubmissions(weekRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const examinerName = useCallback(
    (id) => examiners.find((e) => e.id === id)?.name || 'Unassigned',
    [examiners]
  )

  async function createBooking(form) {
    const { error } = await supabase.from('exams').insert({
      client_name: form.client_name.trim(),
      exam_date: form.exam_date,
      exam_time: form.exam_time,
      exam_type: form.exam_type,
      organization: form.organization,
      duration_minutes: Number(form.duration_minutes) || 60,
      examiner_id: form.examiner_id || null,
      created_by: user?.id ?? null,
    })
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  async function fetchIntake(examId) {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('copay_amount, amount_due_examiner, amount_due_sapps')
      .eq('exam_id', examId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  }

  async function completeExam(exam, financials) {
    const { error: intakeErr } = await supabase
      .from('intake_forms')
      .upsert(
        {
          exam_id: exam.id,
          examiner_id: exam.examiner_id ?? null,
          copay_amount: Number(financials.copay_amount) || 0,
          amount_due_examiner: Number(financials.amount_due_examiner) || 0,
          amount_due_sapps: Number(financials.amount_due_sapps) || 0,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'exam_id' }
      )
    if (intakeErr) return { error: intakeErr.message }

    const { error: examErr } = await supabase
      .from('exams')
      .update({ status: 'completed' })
      .eq('id', exam.id)
    if (examErr) return { error: examErr.message }

    await load()
    return { error: null }
  }

  async function deleteExam(examId) {
    const { error } = await supabase.from('exams').delete().eq('id', examId)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  // Insert a week submission. unique(examiner_id, week_start) means a second
  // submit of the same week is rejected by the DB (23505) — surfaced as a
  // friendly message; the UI also locks an already-submitted week.
  async function submitWeek(payload) {
    const { error } = await supabase.from('week_submissions').insert({
      examiner_id: payload.examiner_id,
      examiner_name: payload.examiner_name,
      week_start: payload.week_start,
      week_end: payload.week_end,
      total_exams: payload.total_exams,
      completed_exams: payload.completed_exams,
      total_revenue: payload.total_revenue,
      submitted_by: user?.email ?? null,
    })
    if (error) {
      if (error.code === '23505') return { error: 'This week has already been submitted.' }
      return { error: error.message }
    }
    await load()
    return { error: null }
  }

  return {
    exams, examiners, examinerName, intakeByExam, weekSubmissions,
    loading, error, refetch: load,
    createBooking, fetchIntake, completeExam, deleteExam, submitWeek,
  }
}
