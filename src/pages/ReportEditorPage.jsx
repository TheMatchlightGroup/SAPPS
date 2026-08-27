import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useReportEditor } from '../hooks/useReportData'
import { REPORT_STATUS_LABEL } from '../lib/reportUtils'
import { COMPANY, orgBillTo } from '../lib/constants'
import '../styles/reports.css'

// The report editor. Header fields + free-text sections, exactly the model
// from the 8/8 call: "header and then a text field where they can type."
// Prefills what the app already knows (name, date, time, agency); the
// examiner types the rest. Desktop-first — nobody types a report on a phone.
export default function ReportEditorPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { exam, template, report, loading, error, saveReport } = useReportEditor(examId)

  const [header, setHeader] = useState({})
  const [sections, setSections] = useState([])
  const [result, setResult] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [savedFlash, setSavedFlash] = useState('')

  // Seed editor state once the exam + template (+ any existing report) load.
  useEffect(() => {
    if (loading || !exam || !template) return
    if (report && report.status !== 'waived') {
      setHeader(report.header || {})
      setSections(report.sections || [])
      setResult(report.result || '')
    } else {
      setHeader(buildPrefillHeader(template.header_fields, exam))
      setSections((template.sections || []).map((s) => ({ ...s })))
      setResult('')
    }
    setDirty(false)
  }, [loading, exam, template, report])

  const status = report?.status || null
  const examinerSig = report?.examiner_name || profile?.name || ''

  const setHeaderField = (key) => (e) => {
    setHeader((h) => ({ ...h, [key]: e.target.value }))
    setDirty(true)
  }
  const setSectionBody = (i) => (e) => {
    setSections((ss) => ss.map((s, idx) => (idx === i ? { ...s, body: e.target.value } : s)))
    setDirty(true)
  }

  async function save(newStatus) {
    setBusy(true)
    setSaveErr('')
    const { error } = await saveReport({
      header, sections, result,
      status: newStatus,
      examiner_name: examinerSig,
    })
    setBusy(false)
    if (error) { setSaveErr(error); return }
    setDirty(false)
    setSavedFlash(newStatus === 'final' ? 'Report finalized ✓' : 'Draft saved ✓')
    setTimeout(() => setSavedFlash(''), 3000)
  }

  const examMeta = useMemo(() => {
    if (!exam) return ''
    return `${exam.client_name} · ${exam.organization} · ${format(parseISO(exam.exam_date), 'MMM d, yyyy')}`
  }, [exam])

  if (loading) return <div className="wl-empty">Loading…</div>
  if (error) return <div className="cal-error">{error}</div>

  return (
    <div className="reports-screen">
      {/* Controls (screen only) */}
      <div className="re-topbar report-controls">
        <button className="iv-back" onClick={() => navigate(-1)}>‹ Back</button>
        <span className="re-context">{examMeta}</span>
        <span className="re-template">{template?.name}</span>
      </div>

      {saveErr && <div className="cal-error">{saveErr}</div>}
      {report?.status === 'waived' && (
        <div className="re-waived-note report-controls">
          This exam was marked "no report needed" ({report.waive_reason}). Writing and finalizing
          a report below will replace that.
        </div>
      )}

      <div className="re-actions report-controls">
        <div className="re-status">
          {status && status !== 'waived' && <span className={`rp-pill ${status}`}>{REPORT_STATUS_LABEL[status]}</span>}
          {dirty && <span className="re-dirty">Unsaved changes</span>}
          {savedFlash && <span className="re-saved">{savedFlash}</span>}
        </div>
        <div className="re-buttons">
          <button className="btn btn-text" onClick={() => save('draft')} disabled={busy}>
            {busy ? 'Saving…' : 'Save draft'}
          </button>
          <button className="btn btn-primary" onClick={() => save('final')} disabled={busy}>
            {status === 'final' ? '✓ Save (stays final)' : '✓ Mark final'}
          </button>
          <button className="btn-xl print re-print" onClick={() => window.print()}>
            🖨 Print / Save PDF
          </button>
        </div>
      </div>

      {/* The report sheet — edits in place, prints on letterhead */}
      <div className="report-sheet">
        <header className="rs-letterhead">
          <img className="rs-logo" src="/SAPPS_logo.svg" alt="Smith & Associates" />
          <div className="rs-company">
            <div className="rs-company-name">{COMPANY.name}</div>
            {COMPANY.addressLines.map((l, i) => <div key={i} className="rs-company-line">{l}</div>)}
            <div className="rs-company-line">{COMPANY.phones}</div>
          </div>
        </header>

        <div className="rs-title">CONFIDENTIAL REPORT</div>

        {/* Identity block */}
        <div className="rs-header-grid">
          {(template.header_fields || []).map((f) => (
            <label key={f.key} className="rs-hf">
              <span className="rs-hf-label">{f.label}</span>
              <input
                className="rs-hf-input"
                type="text"
                value={header[f.key] || ''}
                onChange={setHeaderField(f.key)}
              />
            </label>
          ))}
        </div>

        {/* Result line */}
        <div className="rs-result">
          <span className="rs-result-label">The result of the examination is:</span>
          <select className="rs-result-select" value={result} onChange={(e) => { setResult(e.target.value); setDirty(true) }}>
            <option value="">Select…</option>
            {(template.results || []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <strong className="rs-result-print">{result}</strong>
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <section key={i} className="rs-section">
            <h3 className="rs-section-title">{s.title}</h3>
            <textarea
              className="rs-section-body"
              value={s.body}
              onChange={setSectionBody(i)}
              rows={Math.max(3, Math.min(18, (s.body || '').split('\n').length + 1))}
            />
            <div className="rs-section-print">{s.body}</div>
          </section>
        ))}

        {/* Signature */}
        <div className="rs-signature">
          <p>Please advise if we can assist further.</p>
          <p>Sincerely,</p>
          <p className="rs-sig-name">{examinerSig}</p>
          <p className="rs-sig-line">(Electronic Signature) · Polygraph Examiner</p>
          <p className="rs-sig-fine">
            The signature on this report is electronic. If you are not the intended recipient of
            this report, please contact: 703-304-8392
          </p>
        </div>
      </div>

      <p className="re-foot-hint report-controls">
        Finalized reports are saved to the Report Library automatically. To send: Print / Save PDF,
        then attach it to your own email — same drill as invoices.
      </p>
    </div>
  )
}

function buildPrefillHeader(fields, exam) {
  const h = {}
  for (const f of fields || []) {
    switch (f.prefill) {
      case 'client_name': h[f.key] = exam.client_name || ''; break
      case 'exam_date': h[f.key] = exam.exam_date ? format(parseISO(exam.exam_date), 'M/d/yyyy') : ''; break
      case 'exam_time': h[f.key] = exam.exam_time?.slice(0, 5) || ''; break
      case 'organization': h[f.key] = exam.organization || ''; break
      case 'org_address': h[f.key] = orgBillTo(exam.organization).join(', '); break
      default: h[f.key] = ''
    }
  }
  return h
}
