import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useReportsLibrary } from '../hooks/useReportData'
import { REPORT_STATUS_LABEL } from '../lib/reportUtils'
import '../styles/reports.css'

// The Report Library — searchable by anyone at SAPPS. If an examinee says
// "I tested with y'all six months ago," any examiner can pull the prior
// report themselves instead of interrupting Cris mid-exam.
export default function ReportsPage() {
  const { reports, loading, error } = useReportsLibrary()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [org, setOrg] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const orgs = useMemo(
    () => [...new Set(reports.map((r) => r.organization).filter(Boolean))].sort(),
    [reports]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return reports.filter((r) => {
      if (needle) {
        const hay = `${r.client_name || ''} ${r.examiner_name || ''} ${r.exam_type || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (org && r.organization !== org) return false
      if (from && (r.exam_date || '') < from) return false
      if (to && (r.exam_date || '') > to) return false
      return true
    })
  }, [reports, q, org, from, to])

  const hasFilters = q || org || from || to

  return (
    <div className="reports-screen">
      <div className="rp-toolbar">
        <h2>Report Library</h2>
        <span className="rp-count">
          {loading ? '' : `${filtered.length} of ${reports.length} report${reports.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="rp-filters">
        <input
          className="rp-search"
          type="search"
          placeholder="Search by examinee, examiner, or test type…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={org} onChange={(e) => setOrg(e.target.value)}>
          <option value="">All districts / orgs</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="rp-dates">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span>–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
        {hasFilters && (
          <button className="btn btn-text" onClick={() => { setQ(''); setOrg(''); setFrom(''); setTo('') }}>
            Clear
          </button>
        )}
      </div>

      {error && <div className="cal-error">Couldn't load reports: {error}</div>}

      {loading ? (
        <div className="wl-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="wl-empty">
          {reports.length === 0
            ? 'No reports yet. Reports are started from a completed exam on the calendar.'
            : 'Nothing matches those filters.'}
        </div>
      ) : (
        <div className="rp-list">
          {filtered.map((r) => (
            <button
              key={r.id}
              className="rp-row"
              onClick={() => r.exam_id && navigate(`/reports/exam/${r.exam_id}`)}
              disabled={!r.exam_id}
              title={r.exam_id ? 'Open report' : 'Archived report (exam no longer on calendar)'}
            >
              <div className="rp-row-main">
                <span className="rp-row-name">{r.client_name}</span>
                <span className="rp-row-sub">
                  {r.organization} · {r.exam_type || '—'} · {r.examiner_name || 'Unassigned'}
                </span>
              </div>
              <div className="rp-row-side">
                <span className="rp-row-date">
                  {r.exam_date ? format(parseISO(r.exam_date), 'MMM d, yyyy') : '—'}
                </span>
                <span className={`rp-pill ${r.status}`}>{REPORT_STATUS_LABEL[r.status] || r.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
