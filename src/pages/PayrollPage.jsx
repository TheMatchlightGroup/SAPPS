import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { usePayrollData } from '../hooks/usePayrollData'
import '../styles/payroll.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const COLUMNS = [
  { key: 'examiner_name', label: 'Examiner' },
  { key: 'week_start', label: 'Week' },
  { key: 'completed_exams', label: 'Exams' },
  { key: 'total_revenue', label: 'Revenue', numeric: true },
  { key: 'submitted_at', label: 'Submitted' },
]

export default function PayrollPage() {
  const { submissions, examinerStatus, loading, error, exportSummaryCsv, exportDetailedCsv, hasExams } = usePayrollData()
  const [sort, setSort] = useState({ key: 'submitted_at', dir: 'desc' })

  const sorted = useMemo(() => {
    const arr = [...submissions]
    arr.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key]
      if (sort.key === 'total_revenue' || sort.key === 'completed_exams') {
        av = Number(av) || 0; bv = Number(bv) || 0
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [submissions, sort])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const needsAttention = examinerStatus.filter((e) => e.incomplete > 0)

  return (
    <div>
      <div className="payroll-head">
        <div className="page-head" style={{ margin: 0 }}>
          <h2>Payroll Dashboard</h2>
          <p>Submitted weeks across all examiners. Export for processing and invoicing.</p>
        </div>
        <div className="export-buttons">
          <button className="btn btn-ghost-dark" onClick={exportSummaryCsv} disabled={submissions.length === 0}>
            Export Summary CSV
          </button>
          <button className="btn btn-primary" onClick={exportDetailedCsv} disabled={!hasExams}>
            Export Detailed CSV
          </button>
        </div>
      </div>

      {error && <div className="cal-error">Couldn't load payroll data: {error}</div>}

      {/* Examiner status — who still has open exams */}
      {examinerStatus.length > 0 && (
        <div className="status-section">
          <h3 className="section-title">Examiner Status</h3>
          {needsAttention.length === 0 ? (
            <div className="status-allclear">All examiners are caught up — no incomplete exams.</div>
          ) : (
            <div className="status-cards">
              {needsAttention.map((e) => (
                <div key={e.id} className="status-card warn">
                  <span className="status-name">{e.name}</span>
                  <span className="status-count">{e.incomplete} incomplete {e.incomplete === 1 ? 'exam' : 'exams'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submissions table */}
      <h3 className="section-title">Weekly Submissions</h3>
      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : submissions.length === 0 ? (
        <div className="cal-empty">
          No weeks submitted yet. Submissions appear here once an examiner submits a completed week.
        </div>
      ) : (
        <div className="payroll-table-wrap">
          <table className="payroll-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} onClick={() => toggleSort(c.key)} className={c.numeric ? 'num' : ''}>
                    {c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td>{s.examiner_name}</td>
                  <td>{format(parseISO(s.week_start), 'MMM d')} – {format(parseISO(s.week_end), 'MMM d, yyyy')}</td>
                  <td>{s.completed_exams} of {s.total_exams}</td>
                  <td className="num">${money(s.total_revenue)}</td>
                  <td>{s.submitted_at ? format(parseISO(s.submitted_at), 'MMM d, yyyy h:mm a') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
