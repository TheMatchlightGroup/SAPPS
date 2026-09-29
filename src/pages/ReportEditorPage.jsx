import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useReportEditor } from '../hooks/useReportData'
import { REPORT_STATUS_LABEL } from '../lib/reportUtils'
import { COMPANY, orgAddressLines } from '../lib/constants'
import { isOffice } from '../lib/roles'
import '../styles/reports.css'

const AUTOSAVE_MS = 3000
const isAddressField = (f) => /address/i.test(f.key)
const lettersOf = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')

// The report editor. Header fields + free-text sections ("header and then a
// text field where they can type" — 8/8 call).
//
// Safety net (after the 9/28 incident):
//   • Autosave: edits save themselves a few seconds after typing stops, and
//     again when leaving the page. The browser warns before closing with
//     anything unsaved.
//   • History: the database keeps earlier versions (report_versions); any
//     version can be restored from the History panel.
//   • Someone else's report opens READ-ONLY. The office can choose
//     "Edit anyway"; nobody edits another examiner's report by accident.
//   • The signature is always the exam's examiner, whoever clicks save.
//   • Mark final requires a result and checks the Name matches the exam.
// A fresh editor per exam: switching reports never carries the previous
// report's text (or its pending autosave) across.
export default function ReportEditorRoute() {
  const { examId } = useParams()
  return <ReportEditorPage key={examId} examId={examId} />
}

function ReportEditorPage({ examId }) {
  const navigate = useNavigate()
  const { user, profile, role } = useAuth()
  const {
    exam, examinerName, template, report, orgAddress, loading, error,
    saveReport, saveOrgAddress, loadVersions, findPreviousReports,
  } = useReportEditor(examId)

  const [header, setHeader] = useState({})
  const [sections, setSections] = useState([])
  const [result, setResult] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [flash, setFlash] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [editAnyway, setEditAnyway] = useState(false)
  const [panel, setPanel] = useState(null) // 'history' | 'copy' | null
  const seeded = useRef(false)

  // ---- who may edit ----
  const office = isOffice(role)
  const isOwn = Boolean(exam && user && exam.examiner_id === user.id)
  const unassigned = Boolean(exam && !exam.examiner_id)
  const canWrite = office || isOwn
  const editable = canWrite && (isOwn || unassigned || editAnyway)
  const ownerName = examinerName || 'the examiner'
  const signer = examinerName || report?.examiner_name || profile?.name || ''

  // ---- seed once per load ----
  useEffect(() => {
    if (loading || !exam || !template || seeded.current) return
    seeded.current = true
    if (report && report.status !== 'waived') {
      setHeader(report.header || {})
      setSections(report.sections || [])
      setResult(report.result || '')
    } else {
      setHeader(buildPrefillHeader(template.header_fields, exam, orgAddress))
      setSections((template.sections || []).map((s) => ({ ...s })))
      setResult('')
    }
    setDirty(false)
  }, [loading, exam, template, report, orgAddress])

  // ---- saving (manual + auto) ----
  const latest = useRef({})
  latest.current = { header, sections, result, dirty, editable, report, signer }
  const saving = useRef(false)

  const doSave = useCallback(async (status, note) => {
    const cur = latest.current
    if (saving.current) return { error: null, skipped: true }
    saving.current = true
    setBusy(note !== 'auto')
    setSaveErr('')
    const res = await saveReport({
      header: cur.header, sections: cur.sections, result: cur.result,
      status, examiner_name: cur.signer, note,
    })
    saving.current = false
    setBusy(false)
    if (res.error) { setSaveErr(res.error); return res }
    // Only clear "unsaved" if nothing changed while the save was in flight.
    if (latest.current.header === cur.header && latest.current.sections === cur.sections && latest.current.result === cur.result) setDirty(false)
    setLastSaved(new Date())
    const addrField = (template?.header_fields || []).find(isAddressField)
    if (addrField && cur.header[addrField.key]) saveOrgAddress(cur.header[addrField.key])
    return res
  }, [saveReport, saveOrgAddress, template])

  const doSaveRef = useRef(doSave)
  doSaveRef.current = doSave

  // Autosave: a few seconds after the last keystroke. A new report autosaves
  // as a draft; an existing report keeps its status.
  const autoStatus = () => (latest.current.report?.status === 'final' ? 'final' : 'draft')
  useEffect(() => {
    if (!dirty || !editable) return
    const t = setTimeout(() => { doSave(autoStatus(), 'auto') }, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [header, sections, result, dirty, editable, doSave])

  // Leaving the page (Back, nav links): save whatever is pending.
  useEffect(() => () => {
    const cur = latest.current
    if (cur.dirty && cur.editable) doSaveRef.current(cur.report?.status === 'final' ? 'final' : 'draft', 'auto')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Closing the tab / refreshing with unsaved text: browser warning.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (latest.current.dirty && latest.current.editable) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const touch = () => setDirty(true)
  const setHeaderField = (key) => (e) => { setHeader((h) => ({ ...h, [key]: e.target.value })); touch() }
  const setSectionBody = (i) => (e) => {
    setSections((ss) => ss.map((s, idx) => (idx === i ? { ...s, body: e.target.value } : s)))
    touch()
  }

  function showFlash(t) { setFlash(t); setTimeout(() => setFlash(''), 3000) }

  async function saveDraft() {
    const { error: e } = await doSave(report?.status === 'final' ? 'final' : 'draft', 'manual')
    if (!e) showFlash(report?.status === 'final' ? 'Saved ✓' : 'Draft saved ✓')
  }

  async function markFinal() {
    setSaveErr('')
    if (!result) { setSaveErr('Choose "The result of the examination" before marking this report final.'); return }
    const nameField = (template.header_fields || []).find((f) => f.prefill === 'client_name') || { key: 'name' }
    const onReport = (header[nameField.key] || '').trim()
    const first = lettersOf((exam.client_name || '').split(' ')[0])
    if (onReport && first && !lettersOf(onReport).includes(first)) {
      const ok = window.confirm(
        `The Name on this report ("${onReport}") doesn't match this exam ("${exam.client_name}").\n\n` +
        'Is this the right report for this exam? Press OK to finalize anyway, or Cancel to check it.'
      )
      if (!ok) return
    }
    const { error: e } = await doSave('final', 'manual')
    if (!e) showFlash(report?.status === 'final' ? 'Saved ✓' : 'Report finalized ✓')
  }

  async function downloadWord() {
    // Loaded on demand — the Word library is large and only needed here.
    const { buildReportDocx, downloadBlob } = await import('../lib/reportDocx')
    const fields = (template.header_fields || []).map((f) => ({ label: f.label, value: header[f.key] || '' }))
    const blob = await buildReportDocx({
      fields, result, sections, examinerName: signer,
      licenseNo: header.license_no || '', qcBy: header.qc_by || '',
      clientName: exam.client_name, examDate: exam.exam_date,
    })
    const safe = (exam.client_name || 'Report').replace(/[^\w .-]+/g, '').trim()
    downloadBlob(blob, `SAPPS Report - ${safe} - ${exam.exam_date}.docx`)
  }

  // Restore an earlier version or copy another report: load it into the
  // editor as unsaved changes (the current text is kept in History).
  async function loadContent({ header: h, sections: s, result: r }, note) {
    setHeader(h || {})
    setSections(s || [])
    setResult(r || '')
    setPanel(null)
    latest.current = { ...latest.current, header: h || {}, sections: s || [], result: r || '' }
    const { error: e } = await doSave(report?.status === 'final' ? 'final' : 'draft', note)
    if (!e) showFlash(note === 'restore' ? 'Earlier version restored ✓' : 'Copied in ✓')
  }

  const examMeta = useMemo(() => {
    if (!exam) return ''
    return `${exam.client_name} · ${exam.organization} · ${format(parseISO(exam.exam_date), 'MMM d, yyyy')}`
  }, [exam])

  const resultOptions = useMemo(() => {
    const opts = [...(template?.results || [])]
    if (result && !opts.includes(result)) opts.unshift(result) // earlier wording on older reports
    return opts
  }, [template, result])

  if (loading) return <div className="wl-empty">Loading…</div>
  if (error) return <div className="cal-error">{error}</div>

  const status = report?.status || null
  const readOnly = !editable

  return (
    <div className="reports-screen">
      {/* Controls (screen only) */}
      <div className="re-topbar report-controls">
        <button className="iv-back" onClick={() => navigate(-1)}>‹ Back</button>
        <span className="re-context">{examMeta}</span>
        <span className="re-template">{template?.name}</span>
      </div>

      {saveErr && <div className="cal-error report-controls">{saveErr}</div>}

      {!isOwn && !unassigned && (
        <div className={`re-owner-note report-controls${editable ? ' editing' : ''}`}>
          {editable ? (
            <>
              <strong>You're editing {ownerName}'s report.</strong> Your changes save automatically and are signed as {ownerName}.
              Every earlier version is kept in <button className="link" onClick={() => setPanel('history')}>History</button>.
              <button className="btn btn-text" onClick={() => setEditAnyway(false)}>Stop editing</button>
            </>
          ) : (
            <>
              <strong>This is {ownerName}'s report{report ? '' : ', and it hasn’t been started yet'}.</strong>{' '}
              {report ? 'You’re viewing it read-only.' : 'Nothing has been saved for this exam.'}
              {canWrite && (
                <button className="btn btn-text" onClick={() => setEditAnyway(true)}>
                  {report ? 'Edit anyway' : 'Start it anyway'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {report?.status === 'waived' && (
        <div className="re-waived-note report-controls">
          This exam was marked "no report needed" ({report.waive_reason}). Writing and finalizing
          a report below will replace that.
        </div>
      )}

      <div className="re-actions report-controls">
        <div className="re-status">
          {status && status !== 'waived' && <span className={`rp-pill ${status}`}>{REPORT_STATUS_LABEL[status]}</span>}
          {readOnly ? <span className="re-readonly">Read-only</span>
            : dirty ? <span className="re-dirty">{busy ? 'Saving…' : 'Unsaved — saving automatically'}</span>
              : lastSaved ? <span className="re-saved">All changes saved · {format(lastSaved, 'h:mm a')}</span> : null}
          {flash && <span className="re-saved">{flash}</span>}
        </div>
        <div className="re-buttons">
          {!readOnly && !report && (
            <button className="btn btn-text" onClick={() => setPanel('copy')} disabled={busy}>Copy from a previous report…</button>
          )}
          {report && <button className="btn btn-text" onClick={() => setPanel('history')}>History</button>}
          {!readOnly && (
            <>
              <button className="btn btn-text" onClick={saveDraft} disabled={busy}>
                {busy ? 'Saving…' : status === 'final' ? 'Save' : 'Save draft'}
              </button>
              <button className="btn btn-primary" onClick={markFinal} disabled={busy}>
                {status === 'final' ? '✓ Save (stays final)' : '✓ Mark final'}
              </button>
            </>
          )}
          <button className="btn btn-text" onClick={downloadWord}>⤓ Word</button>
          <button className="btn-xl print re-print" onClick={() => window.print()}>🖨 Print / Save PDF</button>
        </div>
      </div>

      {/* The report sheet — edits in place, prints on letterhead */}
      <div className={`report-sheet${readOnly ? ' readonly' : ''}`}>
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
            <label key={f.key} className={`rs-hf${isAddressField(f) ? ' wide' : ''}`}>
              <span className="rs-hf-label">{f.label}</span>
              {isAddressField(f) ? (
                <>
                  <textarea className="rs-hf-input rs-hf-area" rows={Math.max(2, (header[f.key] || '').split('\n').length)}
                    value={header[f.key] || ''} onChange={setHeaderField(f.key)} readOnly={readOnly} />
                  <span className="rs-hf-print">{header[f.key] || ''}</span>
                </>
              ) : (
                <input className="rs-hf-input" type="text" value={header[f.key] || ''} onChange={setHeaderField(f.key)} readOnly={readOnly} />
              )}
            </label>
          ))}
        </div>

        {/* Result line */}
        <div className="rs-result">
          <span className="rs-result-label">The result of the examination is:</span>
          <select className="rs-result-select" value={result} disabled={readOnly}
            onChange={(e) => { setResult(e.target.value); touch() }}>
            <option value="">Select…</option>
            {resultOptions.map((r) => <option key={r} value={r}>{r}</option>)}
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
              readOnly={readOnly}
              rows={Math.max(3, Math.min(18, (s.body || '').split('\n').length + 1))}
            />
            <div className="rs-section-print">{s.body}</div>
          </section>
        ))}

        {/* Signature */}
        <div className="rs-signature">
          <p>Please advise if we can assist further.</p>
          <p>Sincerely,</p>
          <p className="rs-sig-name">{signer}</p>
          <p className="rs-sig-line">(Electronic Signature) · Polygraph Examiner</p>
          <div className="rs-sig-extra">
            <label>
              <span>License No.:</span>
              <input type="text" value={header.license_no || ''} onChange={setHeaderField('license_no')} readOnly={readOnly} placeholder="________________" />
              <span className="rs-sig-print">{header.license_no || '______________________'}</span>
            </label>
            <label>
              <span>QC:</span>
              <input type="text" value={header.qc_by || ''} onChange={setHeaderField('qc_by')} readOnly={readOnly} placeholder="________________" />
              <span className="rs-sig-print">{header.qc_by || '______________________'}</span>
            </label>
          </div>
          <p className="rs-sig-fine">
            The signature on this report is electronic. If you are not the intended recipient of
            this report, please contact: 703-304-8392
          </p>
        </div>
      </div>

      <p className="re-foot-hint report-controls">
        Reports save automatically as you type and are kept in the Report Library. To send: Print / Save PDF,
        or ⤓ Word for an editable copy, then attach it to your own email.
      </p>

      {panel === 'history' && (
        <HistoryPanel loadVersions={loadVersions} canRestore={!readOnly} current={report}
          onRestore={(v) => loadContent(v, 'restore')} onClose={() => setPanel(null)} />
      )}
      {panel === 'copy' && (
        <CopyPanel find={findPreviousReports} defaultQuery={(exam.client_name || '').split(' ').slice(-1)[0]}
          onPick={(r) => {
            // Keep this exam's own name/date/time; copy the rest.
            const keep = {}
            for (const f of template.header_fields || []) {
              if (['client_name', 'exam_date', 'exam_time', 'organization', 'org_address'].includes(f.prefill)) keep[f.key] = header[f.key]
            }
            loadContent({ header: { ...(r.header || {}), ...keep }, sections: r.sections, result: '' }, 'manual')
          }}
          onClose={() => setPanel(null)} />
      )}
    </div>
  )
}

function HistoryPanel({ loadVersions, canRestore, current, onRestore, onClose }) {
  const [rows, setRows] = useState(null)
  const [open, setOpen] = useState(null)
  useEffect(() => { loadVersions().then(({ data }) => setRows(data)) }, [loadVersions])
  const when = (v) => format(new Date(v.content_at || v.snapshot_at), 'MMM d, yyyy · h:mm a')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal re-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h3>Report history</h3><button className="modal-close" onClick={onClose} aria-label="Close">×</button></header>
        <div className="modal-body">
          <p className="mnote">Earlier versions are kept automatically: before every manual save, before a report is finalized, when someone else edits, and every few minutes while typing.</p>
          {current && (
            <div className="hv-row current">
              <div><strong>Current version</strong><span>{current.updated_by || '—'} · {format(new Date(current.updated_at), 'MMM d, yyyy · h:mm a')}</span></div>
              <span className={`rp-pill ${current.status}`}>{REPORT_STATUS_LABEL[current.status]}</span>
            </div>
          )}
          {rows === null ? <p className="mnote">Loading…</p>
            : rows.length === 0 ? <p className="mnote">No earlier versions yet.</p>
              : rows.map((v) => (
                <div key={v.id} className="hv-item">
                  <div className="hv-row">
                    <div><strong>{when(v)}</strong><span>{v.saved_by || '—'} · {v.reason}</span></div>
                    <span className={`rp-pill ${v.status}`}>{REPORT_STATUS_LABEL[v.status] || v.status}</span>
                  </div>
                  <div className="hv-actions">
                    <button className="btn btn-text" onClick={() => setOpen(open === v.id ? null : v.id)}>{open === v.id ? 'Hide' : 'Preview'}</button>
                    {canRestore && <button className="btn btn-text" onClick={() => {
                      if (window.confirm('Restore this version? The current text will be kept in History too.')) onRestore(v)
                    }}>Restore this version</button>}
                  </div>
                  {open === v.id && (
                    <div className="hv-preview">
                      {v.result && <p><strong>Result:</strong> {v.result}</p>}
                      {(v.sections || []).map((s, i) => <p key={i}><strong>{s.title}.</strong> {(s.body || '').slice(0, 280)}{(s.body || '').length > 280 ? '…' : ''}</p>)}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}

function CopyPanel({ find, defaultQuery, onPick, onClose }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let live = true
    const t = setTimeout(() => find(q).then(({ data }) => { if (live) setRows(data) }), 250)
    return () => { live = false; clearTimeout(t) }
  }, [q, find])
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal re-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h3>Start from a previous report</h3><button className="modal-close" onClick={onClose} aria-label="Close">×</button></header>
        <div className="modal-body">
          <p className="mnote">For re-tests: copy an earlier report's text into this one. This exam's name, date, time and agency are kept; the result is left blank for you to choose.</p>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by examinee name…" autoFocus />
          {rows === null ? <p className="mnote">Searching…</p>
            : rows.length === 0 ? <p className="mnote">No reports match.</p>
              : rows.map((r) => (
                <button key={r.id} className="rp-row" onClick={() => {
                  if (window.confirm(`Copy ${r.client_name}'s ${format(parseISO(r.exam_date), 'M/d/yyyy')} report into this one?`)) onPick(r)
                }}>
                  <div className="rp-row-main">
                    <span className="rp-row-name">{r.client_name}</span>
                    <span className="rp-row-sub">{r.organization} · {r.exam_type || '—'} · {r.examiner_name || '—'}</span>
                  </div>
                  <div className="rp-row-side">
                    <span className="rp-row-date">{format(parseISO(r.exam_date), 'MMM d, yyyy')}</span>
                    <span className={`rp-pill ${r.status}`}>{REPORT_STATUS_LABEL[r.status]}</span>
                  </div>
                </button>
              ))}
        </div>
      </div>
    </div>
  )
}

function buildPrefillHeader(fields, exam, savedAddress) {
  const h = {}
  for (const f of fields || []) {
    switch (f.prefill) {
      case 'client_name': h[f.key] = exam.client_name || ''; break
      case 'exam_date': h[f.key] = exam.exam_date ? format(parseISO(exam.exam_date), 'M/d/yyyy') : ''; break
      case 'exam_time': h[f.key] = exam.exam_time?.slice(0, 5) || ''; break
      case 'organization': h[f.key] = exam.organization || ''; break
      // Remembered address first, then the directory's Bill-To lines, else blank
      // (it used to fall back to the agency NAME, which read like a cut-off address).
      case 'org_address': h[f.key] = savedAddress || orgAddressLines(exam.organization).join('\n'); break
      default: h[f.key] = ''
    }
  }
  return h
}
