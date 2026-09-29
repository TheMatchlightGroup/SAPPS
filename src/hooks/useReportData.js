import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchAll } from '../lib/fetchAll'

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
    const { data, error } = await fetchAll(() => supabase
      .from('reports')
      .select(REPORT_COLS)
      .order('exam_date', { ascending: false })
      .order('id'))
    if (error) setError(error.message)
    setReports(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { reports, loading, error, refetch: load }
}

/** Editor page: the exam, its examiner, the matching template, the report
 *  row (if any), and the agency's remembered address. */
export function useReportEditor(examId) {
  const [exam, setExam] = useState(null)
  const [examinerName, setExaminerName] = useState('')
  const [template, setTemplate] = useState(null)
  const [report, setReportState] = useState(null)
  // Autosave calls saveReport from timers; the ref always holds the latest row.
  const reportRef = useRef(null)
  const setReport = (r) => { reportRef.current = r; setReportState(r) }
  const [orgAddress, setOrgAddress] = useState('')
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
    const [userRes, addrRes] = await Promise.all([
      ex.examiner_id
        ? supabase.from('users').select('name').eq('id', ex.examiner_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('org_addresses').select('address').eq('organization', ex.organization).maybeSingle(),
    ])

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
    setExaminerName(userRes.data?.name || '')
    setOrgAddress(addrRes.data?.address || '')
    setTemplate(matched)
    setReport(reportRes.data || null)
    setLoading(false)
  }, [examId])

  useEffect(() => { load() }, [load])

  /**
   * Upsert the report (keyed on exam_id). `patch` carries header / sections /
   * result / status / examiner_name, plus `note`: 'auto' | 'manual' | 'restore'
   * (the database keeps a copy of the previous text on manual saves and
   * restores — see report_versions).
   */
  async function saveReport(patch) {
    const now = new Date().toISOString()
    const { data: u } = await supabase.auth.getUser()
    const current = reportRef.current
    const staysFinal = patch.status === 'final' && current?.status === 'final'
    const row = {
      exam_id: exam.id,
      template_id: current?.template_id ?? template?.id ?? null,
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
      // Keep the original finalize time when a final report is re-saved.
      finalized_at: patch.status === 'final' ? (staysFinal ? current.finalized_at : now) : null,
      save_note: patch.note || 'manual',
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

  /** Remember an agency's address so future reports pre-fill it. */
  async function saveOrgAddress(address) {
    const clean = (address || '').trim()
    if (!exam || !clean || clean === orgAddress.trim()) return
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('org_addresses').upsert(
      { organization: exam.organization, address: clean, updated_at: new Date().toISOString(), updated_by: u?.user?.email ?? null },
      { onConflict: 'organization' }
    )
    if (!error) setOrgAddress(clean)
  }

  /** Earlier versions of this report, newest first. */
  const loadVersions = useCallback(async () => {
    if (!report?.id) return { data: [], error: null }
    const { data, error } = await supabase
      .from('report_versions')
      .select('id, status, examiner_name, header, sections, result, saved_by, content_at, snapshot_at, reason')
      .eq('report_id', report.id)
      .order('snapshot_at', { ascending: false })
    return { data: data || [], error: error?.message || null }
  }, [report?.id])

  /** Other reports to start from (re-tests): matched on the examinee's name. */
  const findPreviousReports = useCallback(async (q) => {
    const needle = (q || '').trim()
    let query = supabase
      .from('reports')
      .select(REPORT_COLS)
      .neq('status', 'waived')
      .order('exam_date', { ascending: false })
      .limit(25)
    if (needle) query = query.ilike('client_name', `%${needle}%`)
    const { data, error } = await query
    return { data: (data || []).filter((r) => r.exam_id !== examId), error: error?.message || null }
  }, [examId])

  return {
    exam, examinerName, template, report, orgAddress, loading, error,
    saveReport, saveOrgAddress, loadVersions, findPreviousReports, refetch: load,
  }
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
  'NO SIGNIFICANT REACTIONS / NO DECEPTION INDICATED',
  'SIGNIFICANT REACTIONS / DECEPTION INDICATED',
  'INCONCLUSIVE / NO OPINION',
  'INCONCLUSIVE / SUSPECTED COUNTERMEASURES',
  'TERMINATED',
]
