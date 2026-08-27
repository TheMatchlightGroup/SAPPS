import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// ---------------------------------------------------------------
// Reports data layer.
//
// The library is the archive Cris asked for: every report lives in
// the database, searchable by name / district / date, readable by
// ALL examiners (RLS: select is open to authenticated) so nobody
// has to interrupt Cris mid-exam to get a prior report pulled.
// Writes stay scoped: admins, or the examiner who owns the exam.
// ---------------------------------------------------------------

const REPORT_COLS =
  'id, exam_id, template_id, examiner_id, examiner_name, client_name, organization, exam_date, exam_type, header, sections, result, status, waive_reason, created_at, updated_at, finalized_at'

/** Library page: full list, filtered client-side (volumes are small). */
export function useReportsLibrary() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('reports')
      .select(REPORT_COLS)
      .order('exam_date', { ascending: false })
    if (error) setError(error.message)
    setReports(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { reports, loading, error, refetch: load }
}

/** Editor page: the exam, the matching template, and the report row (if any). */
export function useReportEditor(examId) {
  const [exam, setExam] = useState(null)
  const [template, setTemplate] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const [examRes, reportRes, tplRes] = await Promise.all([
      supabase
        .from('exams')
        .select('id, client_name, exam_date, exam_time, exam_type, organization, status, examiner_id')
        .eq('id', examId)
        .maybeSingle(),
      supabase.from('reports').select(REPORT_COLS).eq('exam_id', examId).maybeSingle(),
      supabase
        .from('report_templates')
        .select('id, name, test_types, header_fields, sections, results, active')
        .eq('active', true),
    ])

    if (examRes.error) { setError(examRes.error.message); setLoading(false); return }
    if (!examRes.data) { setError('Exam not found (it may have been deleted).'); setLoading(false); return }

    const ex = examRes.data
    const templates = tplRes.data || []
    // Best template for this exam's test type; otherwise a generic fallback
    // so a missing template never blocks a report from being written.
    const matched =
      templates.find((t) => (t.test_types || []).includes(ex.exam_type)) || {
        id: null,
        name: 'General Report',
        header_fields: DEFAULT_HEADER_FIELDS,
        sections: [{ title: 'REPORT', body: '' }],
        results: DEFAULT_RESULTS,
      }

    setExam(ex)
    setTemplate(matched)
    setReport(reportRes.data || null)
    setLoading(false)
  }, [examId])

  useEffect(() => { load() }, [load])

  /** Upsert the report (keyed on exam_id). `patch` carries header/sections/result/status. */
  async function saveReport(patch) {
    const now = new Date().toISOString()
    const { data: u } = await supabase.auth.getUser()
    const row = {
      exam_id: exam.id,
      template_id: template?.id ?? null,
      examiner_id: exam.examiner_id ?? null,
      examiner_name: patch.examiner_name,
      client_name: exam.client_name,
      organization: exam.organization,
      exam_date: exam.exam_date,
      exam_type: exam.exam_type,
      header: patch.header,
      sections: patch.sections,
      result: patch.result ?? '',
      status: patch.status,
      waive_reason: patch.status === 'waived' ? (patch.waive_reason || 'Polygraph terminated — no report required') : null,
      updated_at: now,
      updated_by: u?.user?.email ?? null,
      finalized_at: patch.status === 'final' ? now : null,
    }
    const { data, error } = await supabase
      .from('reports')
      .upsert(row, { onConflict: 'exam_id' })
      .select(REPORT_COLS)
      .single()
    if (error) return { error: error.message }
    setReport(data)
    return { error: null, data }
  }

  return { exam, template, report, loading, error, saveReport, refetch: load }
}

export const DEFAULT_HEADER_FIELDS = [
  { key: 'name', label: 'Name', prefill: 'client_name' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'DOB' },
  { key: 'age', label: 'Age' },
  { key: 'birthplace', label: 'Birthplace' },
  { key: 'ssn', label: 'SSN (last 4)' },
  { key: 'date_of_exam', label: 'Date of Exam', prefill: 'exam_date' },
  { key: 'time_of_exam', label: 'Time of Exam', prefill: 'exam_time' },
  { key: 'agency', label: 'Agency', prefill: 'organization' },
  { key: 'agency_address', label: 'Agency Address', prefill: 'org_address' },
]

export const DEFAULT_RESULTS = [
  'NO SIGNIFICANT REACTIONS / TRUTHFUL',
  'SIGNIFICANT REACTIONS / UNTRUTHFUL',
  'INCONCLUSIVE / NO OPINION',
]
