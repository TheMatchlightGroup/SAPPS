import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Central data layer for the calendar: loads exams and the examiner roster,
// exposes a refetch, and creates bookings. RLS handles who sees/does what —
// an admin/office sees all exams; an examiner would see only their own.
export function useCalendarData() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [examiners, setExaminers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [examRes, examinerRes] = await Promise.all([
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
    ])

    if (examRes.error) setError(examRes.error.message)
    setExams(examRes.data || [])
    setExaminers(examinerRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Map examiner_id -> name for display without re-querying.
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

  return { exams, examiners, examinerName, loading, error, refetch: load, createBooking }
}
