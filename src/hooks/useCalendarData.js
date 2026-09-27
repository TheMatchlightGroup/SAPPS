import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { withColors } from '../lib/examinerColors'
import { fetchAll } from '../lib/fetchAll'
import { normalizeIntake } from '../lib/amounts'

// Central data layer: exams, examiner roster, financials (intake_forms),
// and week submissions. RLS decides who sees and does what.
export function useCalendarData() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [examiners, setExaminers] = useState([])
  const [intakeByExam, setIntakeByExam] = useState({})
  const [reportByExam, setReportByExam] = useState({})
  const [weekSubmissions, setWeekSubmissions] = useState([])
  // Office-only (RLS returns nothing to examiners / team leads).
  // Keyed `${examiner_id}__${date}` -> { examiner_id, date, note }
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Loading starts true for the first fetch only. Refetches after a save
  // happen quietly in the background, so the calendar (and an open day
  // drawer) doesn't blink out to "Loading…" every time something changes.
  const load = useCallback(async () => {
    setError('')
    const [examRes, examinerRes, intakeRes, weekRes, reportRes, availRes] = await Promise.all([
      fetchAll(() => supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_time, exam_type, organization, duration_minutes, status, examiner_id')
        .order('exam_date', { ascending: true })
        .order('exam_time', { ascending: true })
        .order('id', { ascending: true })),
      // is_examiner (not role) decides who appears in examiner lists —
      // Cris is payroll_admin AND runs her own exams.
      supabase
        .from('users')
        .select('id, name, color')
        .eq('is_examiner', true)
        .eq('active', true)
        .order('name', { ascending: true }),
      fetchAll(() => supabase
        .from('intake_forms')
        .select('exam_id, exam_amount, copay_amount, amount_due_examiner, amount_due_sapps')
        .order('exam_id')),
      fetchAll(() => supabase
        .from('week_submissions')
        .select('id, examiner_id, examiner_name, week_start, week_end, total_exams, completed_exams, total_revenue, total_net, submitted_at')
        .order('week_start', { ascending: false })
        .order('id')),
      fetchAll(() => supabase
        .from('reports')
        .select('id, exam_id, status')
        .order('id')),
      fetchAll(() => supabase
        .from('examiner_availability')
        .select('examiner_id, date, note')
        .order('date')
        .order('examiner_id')),
    ])
    if (examRes.error) setError(examRes.error.message)

    const typeOf = {}
    for (const e of examRes.data || []) typeOf[e.id] = e.exam_type
    const intakeMap = {}
    for (const row of intakeRes.data || []) intakeMap[row.exam_id] = normalizeIntake(row, typeOf[row.exam_id])

    const reportMap = {}
    for (const row of reportRes.data || []) if (row.exam_id) reportMap[row.exam_id] = row

    setExams(examRes.data || [])
    setExaminers(withColors(examinerRes.data || []))
    setIntakeByExam(intakeMap)
    setReportByExam(reportMap)
    setWeekSubmissions(weekRes.data || [])
    const avail = {}
    for (const r of availRes.data || []) avail[`${r.examiner_id}__${r.date}`] = r
    setAvailability(avail)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const examinerName = useCallback(
    (id) => examiners.find((e) => e.id === id)?.name || 'Unassigned',
    [examiners]
  )
  const examinerColor = useCallback(
    (id) => examiners.find((e) => e.id === id)?.color || null,
    [examiners]
  )

  // ---- Availability (office) ----
  // Paint strokes change many days at once, so this takes a batch:
  // `adds` / `removes` are [{ examiner_id, date }]. The calendar updates
  // instantly; the database write follows, and a failure reloads truth.
  // Writes go through a queue, one after another, so a quick on/off/on can
  // never land at the database out of order.
  const writeQueue = useRef(Promise.resolve())
  const enqueue = useCallback((job) => {
    const run = writeQueue.current.then(job, job)
    writeQueue.current = run.catch(() => {})
    return run
  }, [])

  const changeAvailability = useCallback(async ({ adds = [], removes = [] }) => {
    if (!adds.length && !removes.length) return { error: null }
    setAvailability((m) => {
      const next = { ...m }
      for (const a of adds) next[`${a.examiner_id}__${a.date}`] = { examiner_id: a.examiner_id, date: a.date, note: m[`${a.examiner_id}__${a.date}`]?.note ?? null }
      for (const r of removes) delete next[`${r.examiner_id}__${r.date}`]
      return next
    })
    const who = user?.email ?? null
    const now = new Date().toISOString()
    return enqueue(async () => {
    const errors = []
    if (adds.length) {
      const { error } = await supabase.from('examiner_availability').upsert(
        adds.map((a) => ({ examiner_id: a.examiner_id, date: a.date, updated_at: now, updated_by: who })),
        { onConflict: 'examiner_id,date', ignoreDuplicates: true }
      )
      if (error) errors.push(error.message)
    }
    // Deletes grouped per examiner: one request each.
    const byExaminer = {}
    for (const r of removes) (byExaminer[r.examiner_id] ||= []).push(r.date)
    for (const [examinerId, dates] of Object.entries(byExaminer)) {
      const { error } = await supabase.from('examiner_availability').delete()
        .eq('examiner_id', examinerId).in('date', dates)
      if (error) errors.push(error.message)
    }
    if (errors.length) { await load(); return { error: errors[0] } }
    return { error: null }
    })
  }, [user, load, enqueue]) // eslint-disable-line react-hooks/exhaustive-deps

  const setAvailabilityNote = useCallback(async (examinerId, date, note) => {
    const clean = (note || '').trim() || null
    setAvailability((m) => {
      const k = `${examinerId}__${date}`
      return m[k] ? { ...m, [k]: { ...m[k], note: clean } } : m
    })
    // Upsert (not update), queued behind any pending toggle, so a note typed
    // right after marking someone available always lands.
    return enqueue(async () => {
      const { error } = await supabase.from('examiner_availability').upsert(
        { examiner_id: examinerId, date, note: clean, updated_at: new Date().toISOString(), updated_by: user?.email ?? null },
        { onConflict: 'examiner_id,date' }
      )
      return { error: error?.message || null }
    })
  }, [user, enqueue])

  // Tier 3: change an examiner's calendar color.
  const setExaminerColor = useCallback(async (examinerId, hex) => {
    setExaminers((xs) => xs.map((e) => (e.id === examinerId ? { ...e, color: hex } : e)))
    const { error } = await supabase.from('users').update({ color: hex }).eq('id', examinerId)
    if (error) { await load(); return { error: error.message } }
    return { error: null }
  }, [load])

  async function createBooking(form) {
    const { error } = await supabase.from('exams').insert({
      client_name: form.client_name.trim(),
      exam_date: form.exam_date,
      exam_time: form.exam_time,
      exam_type: null, // chosen by the examiner at completion, not at booking
      organization: form.organization,
      duration_minutes: Number(form.duration_minutes) || 60,
      examiner_id: form.examiner_id || null,
      created_by: user?.id ?? null,
    })
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  // Office-side booking edits (reshuffles, swaps, name fixes). Never touches
  // exam_type or status — those belong to the completion flow.
  async function updateBooking(examId, form) {
    const { error } = await supabase
      .from('exams')
      .update({
        client_name: form.client_name.trim(),
        exam_date: form.exam_date,
        exam_time: form.exam_time,
        organization: form.organization,
        duration_minutes: Number(form.duration_minutes) || 60,
        examiner_id: form.examiner_id || null,
      })
      .eq('id', examId)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  // Stable identity (useCallback) so the completion modal's prefill effect
  // runs once per exam — not on every calendar re-render, which used to
  // wipe amounts mid-entry (e.g. after a background token refresh).
  const fetchIntake = useCallback(async (examId) => {
    const { data, error } = await supabase
      .from('intake_forms')
      .select('exam_amount, copay_amount, amount_due_examiner, amount_due_sapps')
      .eq('exam_id', examId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  }, [])

  async function completeExam(exam, financials) {
    const { error: intakeErr } = await supabase
      .from('intake_forms')
      .upsert(
        {
          exam_id: exam.id,
          examiner_id: exam.examiner_id ?? null,
          exam_amount: Number(financials.exam_amount) || 0,
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
      .update({ status: 'completed', exam_type: financials.exam_type || exam.exam_type || null })
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

  // Insert or refresh a week submission. unique(examiner_id, week_start) plus
  // upsert means the first submit creates the row and any re-submit (after the
  // week's exams change) updates it in place with fresh totals and timestamp.
  async function submitWeek(payload) {
    const { error } = await supabase.from('week_submissions').upsert(
      {
        examiner_id: payload.examiner_id,
        examiner_name: payload.examiner_name,
        week_start: payload.week_start,
        week_end: payload.week_end,
        total_exams: payload.total_exams,
        completed_exams: payload.completed_exams,
        total_revenue: payload.total_revenue,
        total_net: payload.total_net,
        submitted_at: new Date().toISOString(),
        submitted_by: user?.email ?? null,
      },
      { onConflict: 'examiner_id,week_start' }
    )
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  // "No report needed" — polygraph terminated (sick examinee, no payment,
  // PO pulled the plug). Creates/updates the report row as waived so the
  // week-submit gate and the library both know. Unwaiving deletes the
  // placeholder row (a waived row holds no written content).
  async function waiveReport(exam, reason) {
    const { error } = await supabase.from('reports').upsert(
      {
        exam_id: exam.id,
        examiner_id: exam.examiner_id ?? null,
        client_name: exam.client_name,
        organization: exam.organization,
        exam_date: exam.exam_date,
        exam_type: exam.exam_type ?? null,
        status: 'waived',
        waive_reason: reason || 'Polygraph terminated — no report required',
        updated_at: new Date().toISOString(),
        updated_by: user?.email ?? null,
      },
      { onConflict: 'exam_id' }
    )
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  async function unwaiveReport(exam) {
    const existing = reportByExam[exam.id]
    if (!existing) return { error: null }
    const { error } = await supabase.from('reports').delete().eq('id', existing.id).eq('status', 'waived')
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  return {
    exams, examiners, examinerName, examinerColor, intakeByExam, reportByExam, weekSubmissions,
    availability, changeAvailability, setAvailabilityNote, setExaminerColor,
    loading, error, refetch: load,
    createBooking, updateBooking, fetchIntake, completeExam, deleteExam, submitWeek,
    waiveReport, unwaiveReport,
  }
}
