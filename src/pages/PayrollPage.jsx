import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { usePayrollData } from '../hooks/usePayrollData'
import { buildReminderMailto, weekRangeLabel, monthLabelOf } from '../lib/monthClose'
import '../styles/payroll.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const thisMonth = () => new Date().toISOString().slice(0, 7)

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const COLUMNS = [
  { key: 'examiner_name', label: 'Examiner' },
  { key: 'week_start', label: 'Week' },
  { key: 'completed_exams', label: 'Exams' },
  { key: 'total_revenue', label: 'Revenue', numeric: true },
  { key: 'submitted_at', label: 'Submitted' },
]

export default function PayrollPage() {
  const [month, setMonth] = useState(thisMonth())
  const { monthClose, monthSubmissions, loading, error, exportSummaryCsv, exportDetailedCsv, hasMonthExams } =
    usePayrollData(month)
  const navigate = useNavigate()

  const monthLabel = monthLabelOf(month)
  const monthName = monthLabel.split(' ')[0]
  const { rows, outstanding, allIn, hasWork } = monthClose

  return (
    <div className="payroll-screen">
      {/* Month picker — same big arrows as Invoicing */}
      <div className="pr-month-bar">
        <button className="pr-arrow" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="pr-month-label">{monthLabel}</span>
        <button className="pr-arrow" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        {month !== thisMonth() && (
          <button className="pr-thismonth" onClick={() => setMonth(thisMonth())}>This month</button>
        )}
      </div>

      {error && <div className="cal-error">Couldn't load payroll data: {error}</div>}

      {loading ? (
        <div className="pr-empty">Loading…</div>
      ) : !hasWork ? (
        <div className="pr-empty">No exams on the books for {monthName}. Use the arrows to pick another month.</div>
      ) : (
        <>
          {/* THE answer, up top: is the month done? */}
          {allIn ? (
            <div className="pr-banner clear">
              <span className="pr-banner-check" aria-hidden="true">✓</span>
              <div className="pr-banner-text">
                <strong>Everyone's in for {monthName}.</strong>
                <span>All exams have amounts and every week has been submitted. You're ready to invoice.</span>
              </div>
              <button className="pr-banner-go" onClick={() => navigate('/invoicing')}>
                Review {monthName} invoices →
              </button>
            </div>
          ) : (
            <div className="pr-banner waiting">
              <div className="pr-banner-text">
                <strong>
                  Waiting on {outstanding.length} {outstanding.length === 1 ? 'examiner' : 'examiners'} for {monthName}.
                </strong>
                <span>Each card below shows exactly what's missing — tap "Email a reminder" to nudge them.</span>
              </div>
            </div>
          )}

          {/* One card per examiner with work this month */}
          <div className="pr-cards">
            {[...rows].sort((a, b) => Number(a.allIn) - Number(b.allIn) || a.name.localeCompare(b.name)).map((r) => (
              <ExaminerCard key={r.id} row={r} month={month} monthName={monthName} />
            ))}
          </div>

          {/* Secondary: raw submissions + exports */}
          <details className="pr-details">
            <summary>Submitted weeks &amp; exports for {monthName}</summary>

            <div className="export-buttons" style={{ margin: 'var(--s-4) 0' }}>
              <button className="btn btn-ghost-dark" onClick={exportSummaryCsv} disabled={monthSubmissions.length === 0}>
                Export {monthName} Summary CSV
              </button>
              <button className="btn btn-primary" onClick={exportDetailedCsv} disabled={!hasMonthExams}>
                Export {monthName} Detailed CSV
              </button>
            </div>

            {monthSubmissions.length === 0 ? (
              <div className="pr-empty small">No weeks submitted for {monthName} yet.</div>
            ) : (
              <SubmissionsTable submissions={monthSubmissions} />
            )}
          </details>
        </>
      )}
    </div>
  )
}

function ExaminerCard({ row, month, monthName }) {
  if (row.allIn) {
    return (
      <div className="pr-card clear">
        <div className="pr-card-head">
          <span className="pr-card-name">{row.name}</span>
          <span className="pr-pill clear">✓ All in</span>
        </div>
        <p className="pr-card-line">
          {row.completedDue} {row.completedDue === 1 ? 'exam' : 'exams'} completed ·{' '}
          {row.weeksSubmitted} {row.weeksSubmitted === 1 ? 'week' : 'weeks'} submitted
          {row.upcomingCount > 0 && <> · {row.upcomingCount} still upcoming</>}
          {row.inProgressWeeks.length > 0 && <> · current week in progress</>}
        </p>
      </div>
    )
  }

  return (
    <div className="pr-card waiting">
      <div className="pr-card-head">
        <span className="pr-card-name">{row.name}</span>
        <span className="pr-pill waiting">Outstanding</span>
      </div>

      {row.incompleteExams.length > 0 && (
        <div className="pr-missing">
          <span className="pr-missing-label">
            {row.incompleteExams.length} {row.incompleteExams.length === 1 ? 'exam needs' : 'exams need'} amounts entered:
          </span>
          <ul>
            {row.incompleteExams.map((e) => (
              <li key={e.id}>{format(parseISO(e.exam_date), 'MMM d')} — {e.client_name}</li>
            ))}
          </ul>
        </div>
      )}

      {row.outstandingWeeks.length > 0 && (
        <div className="pr-missing">
          <span className="pr-missing-label">
            {row.outstandingWeeks.length} {row.outstandingWeeks.length === 1 ? 'week hasn\u2019t' : 'weeks haven\u2019t'} been submitted:
          </span>
          <ul>
            {row.outstandingWeeks.map((wk) => <li key={wk}>Week of {weekRangeLabel(wk)}</li>)}
          </ul>
        </div>
      )}

      {row.email ? (
        <a className="pr-remind" href={buildReminderMailto(row, month)}>
          ✉ Email {row.name.split(' ')[0]} a reminder
        </a>
      ) : (
        <span className="pr-remind-none">No email on file for {row.name}.</span>
      )}
    </div>
  )
}

function SubmissionsTable({ submissions }) {
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

  return (
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
  )
}
