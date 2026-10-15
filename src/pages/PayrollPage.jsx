import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { usePayrollData } from '../hooks/usePayrollData'
import { buildReminderEmail, weekRangeLabel, monthLabelOf } from '../lib/monthClose'
import { gmailComposeUrl, mailtoUrl, copyEmailToClipboard } from '../lib/emailLinks'
import { timeRange } from '../lib/privateBlocks'
import '../styles/payroll.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const thisMonth = () => {
  const d = new Date() // local month, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const COLUMNS = [
  { key: 'examiner_name', label: 'Examiner' },
  { key: 'week_start', label: 'Week' },
  { key: 'completed_exams', label: 'Exams' },
  { key: 'total_revenue', label: 'Exam Amounts', numeric: true },
  { key: 'submitted_at', label: 'Submitted' },
]

export default function PayrollPage() {
  const [month, setMonth] = useState(thisMonth())
  const {
    monthClose, monthSubmissions, loading, error, exportSummaryCsv, exportDetailedCsv, hasMonthExams,
    monthPrivate, markDeducted, setOfficeRate,
  } = usePayrollData(month)
  const navigate = useNavigate()

  const monthLabel = monthLabelOf(month)
  const monthName = monthLabel.split(' ')[0]
  const { rows, outstanding, allIn, hasWork } = monthClose
  const hasPrivate = monthPrivate.some((g) => g.blocks.length > 0)

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
        <>
          <div className="pr-empty">No exams on the books for {monthName}. Use the arrows to pick another month.</div>
          {hasPrivate && <PrivateOfficeSection groups={monthPrivate} monthName={monthName} onMark={markDeducted} onRate={setOfficeRate} />}
        </>
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

          {/* Private exams held at the office → fees to deduct (10/15) */}
          {monthPrivate.length > 0 && (
            <PrivateOfficeSection groups={monthPrivate} monthName={monthName} onMark={markDeducted} onRate={setOfficeRate} />
          )}

          {/* Secondary: raw submissions + exports */}
          <details className="pr-details">
            <summary>Submitted weeks &amp; exports for {monthName}</summary>

            <div className="export-buttons" style={{ margin: 'var(--s-4) 0' }}>
              <button className="btn btn-ghost-dark" onClick={exportSummaryCsv} disabled={monthSubmissions.length === 0}>
                Export {monthName} Summary CSV
              </button>
              <button className="btn btn-primary" onClick={exportDetailedCsv} disabled={!hasMonthExams && !hasPrivate}>
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

// Private exams at the SAPPS office — the reminder for payroll to take
// each examiner's office fees out of their pay, then mark them deducted.
function PrivateOfficeSection({ groups, monthName, onMark, onRate }) {
  const owedTotal = groups.reduce((n, g) => n + g.owed, 0)
  const [err, setErr] = useState('')
  return (
    <section className="pr-private">
      <div className="pr-private-head">
        <div>
          <h3>Private office use — deduct from pay</h3>
          <p>
            Private exams examiners held at the SAPPS office in {monthName}. Take each examiner's fees
            out of their paycheck, then mark them deducted.
          </p>
        </div>
        <span className={`pr-pill ${owedTotal > 0 ? 'waiting' : 'clear'}`}>
          {owedTotal > 0 ? `$${money(owedTotal)} to deduct` : '✓ Nothing to deduct'}
        </span>
      </div>
      {err && <div className="cal-error">{err}</div>}
      <div className="pr-private-cards">
        {groups.map((g) => <PrivateCard key={g.id} g={g} monthName={monthName} onMark={onMark} onRate={onRate} onError={setErr} />)}
      </div>
    </section>
  )
}

function PrivateCard({ g, monthName, onMark, onRate, onError }) {
  const [busy, setBusy] = useState(false)
  const [editRate, setEditRate] = useState(false)
  const [rate, setRate] = useState(g.rate == null ? '' : String(g.rate))
  const first = g.name.split(' ')[0]

  async function run(fn) {
    setBusy(true); onError('')
    const { error: e } = await fn()
    setBusy(false)
    if (e) onError(e)
    return !e
  }

  return (
    <div className={`pr-card ${g.owed > 0 ? 'waiting' : 'clear'}`}>
      <div className="pr-card-head">
        <span className="pr-card-name">{g.name}</span>
        {g.owed > 0
          ? <span className="pr-pill waiting">${money(g.owed)} to deduct</span>
          : g.deductedIds.length > 0 ? <span className="pr-pill clear">✓ Deducted</span> : null}
      </div>

      <div className="pr-rate">
        {editRate ? (
          <span className="pr-rate-edit">
            $<input type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={`${first}'s office fee per exam`} autoFocus />
            per exam
            <button className="link" disabled={busy} onClick={async () => { if (await run(() => onRate(g.id, rate))) setEditRate(false) }}>Save</button>
            <button className="link" onClick={() => { setRate(g.rate == null ? '' : String(g.rate)); setEditRate(false) }}>Cancel</button>
          </span>
        ) : (
          <>
            Office fee: <strong>{g.rate == null ? 'not set' : `$${money(g.rate)} per exam`}</strong>
            <button className="link" onClick={() => setEditRate(true)}>Change</button>
          </>
        )}
      </div>
      {editRate && <p className="pr-rate-note">Applies to private exams logged from now on. Ones already logged keep their fee.</p>}

      {g.blocks.length === 0 ? (
        <p className="pr-card-line">No private office exams logged in {monthName}.</p>
      ) : (
        <ul className="pr-private-list">
          {g.blocks.map((b) => (
            <li key={b.id} className={b.deducted_at ? 'done' : !g.owedIds.includes(b.id) ? 'upcoming' : ''}>
              <span>
                {format(parseISO(b.block_date), 'EEE, MMM d')} · {timeRange(b.start_time, b.duration_minutes)}
                {!b.deducted_at && !g.owedIds.includes(b.id) && <em className="pr-upcoming"> upcoming</em>}
              </span>
              <span className="pr-private-fee">${money(b.office_fee)}{b.deducted_at ? ' ✓' : ''}</span>
            </li>
          ))}
        </ul>
      )}

      {g.owedIds.length > 0 && (
        <button className="pr-remind" disabled={busy} onClick={() => run(() => onMark(g.owedIds, true))}>
          {busy ? 'Saving…' : `✓ Mark $${money(g.owed)} deducted from ${first}'s pay`}
        </button>
      )}
      {g.owedIds.length === 0 && g.deductedIds.length > 0 && (
        <button className="link pr-undo" disabled={busy} onClick={() => run(() => onMark(g.deductedIds, false))}>
          Undo — mark as not deducted
        </button>
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
        <ReminderButtons row={row} month={month} />
      ) : (
        <span className="pr-remind-none">No email on file for {row.name}.</span>
      )}
    </div>
  )
}

// One tap opens the reminder wherever the admin actually emails from.
function ReminderButtons({ row, month }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const email = buildReminderEmail(row, month)
  const first = row.name.split(' ')[0]

  async function copy() {
    try {
      await copyEmailToClipboard(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (_) { /* clipboard blocked; the other two options remain */ }
  }

  if (!open) {
    return (
      <button className="pr-remind" onClick={() => setOpen(true)}>
        ✉ Email {first} a reminder
      </button>
    )
  }
  return (
    <div className="pr-remind-choices">
      <a className="pr-remind-choice" href={gmailComposeUrl(email)} target="_blank" rel="noreferrer">
        Open in Gmail
      </a>
      <a className="pr-remind-choice" href={mailtoUrl(email)}>
        Open in Mail app
      </a>
      <button className="pr-remind-choice" onClick={copy}>
        {copied ? '✓ Copied' : 'Copy message'}
      </button>
      <button className="pr-remind-cancel" onClick={() => setOpen(false)} aria-label="Close">×</button>
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
