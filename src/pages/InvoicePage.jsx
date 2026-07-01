import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useInvoiceData } from '../hooks/useInvoiceData'
import { COMPANY, orgCode, orgBillTo, orgEmails } from '../lib/constants'
import '../styles/invoice.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const thisMonth = () => new Date().toISOString().slice(0, 7)

// Shift a 'YYYY-MM' string by whole months.
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function InvoicePage() {
  const { exams, intakeByExam, loading, sentStatus, markInvoiceSent, unmarkInvoiceSent, monthCloseFor } = useInvoiceData()
  const [month, setMonth] = useState(thisMonth())
  const [selectedOrg, setSelectedOrg] = useState(null)

  // Examiners who haven't finished this month — invoices could still grow.
  const payrollOutstanding = useMemo(
    () => monthCloseFor(month).outstanding,
    [monthCloseFor, month]
  )

  const amountOf = (e) => {
    const f = intakeByExam[e.id] || {}
    return (Number(f.amount_due_examiner) || 0) + (Number(f.amount_due_sapps) || 0)
  }
  const copayOf = (e) => Number((intakeByExam[e.id] || {}).copay_amount) || 0

  // Exams completed in the chosen month.
  const monthExams = useMemo(
    () => exams.filter((e) => e.exam_date.startsWith(month)),
    [exams, month]
  )

  // One entry per client with work this month, plus its sent status.
  const entities = useMemo(() => {
    const map = {}
    for (const e of monthExams) {
      const o = (map[e.organization] ||= { name: e.organization, count: 0, due: 0 })
      o.count += 1
      o.due += amountOf(e) - copayOf(e)
    }
    return Object.values(map)
      .map((o) => ({ ...o, sent: sentStatus(o.name, month) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [monthExams, sentStatus, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const [y, m] = month.split('-')
  const monthLabel = `${MONTHS[Number(m)]} ${y}`

  if (selectedOrg) {
    return (
      <InvoiceDetail
        org={selectedOrg}
        month={month}
        monthLabel={monthLabel}
        exams={monthExams.filter((e) => e.organization === selectedOrg)}
        amountOf={amountOf}
        copayOf={copayOf}
        sent={sentStatus(selectedOrg, month)}
        onMarkSent={markInvoiceSent}
        onUnmark={unmarkInvoiceSent}
        onBack={() => setSelectedOrg(null)}
      />
    )
  }

  const ready = entities.filter((e) => !e.sent)
  const done = entities.filter((e) => e.sent)

  return (
    <div className="invoice-screen">
      {/* Month picker — big arrows, month spelled out */}
      <div className="wl-month-bar">
        <button className="wl-arrow" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="wl-month-label">{monthLabel}</span>
        <button className="wl-arrow" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        {month !== thisMonth() && (
          <button className="wl-thismonth" onClick={() => setMonth(thisMonth())}>This month</button>
        )}
      </div>

      {loading ? (
        <div className="wl-empty">Loading…</div>
      ) : entities.length === 0 ? (
        <div className="wl-empty">No completed exams in {monthLabel}. Use the arrows to pick another month.</div>
      ) : (
        <>
          {payrollOutstanding.length > 0 && (
            <div className="wl-payroll-note">
              <span className="wl-payroll-note-icon" aria-hidden="true">!</span>
              <span>
                <strong>Heads up:</strong>{' '}
                {payrollOutstanding.map((r) => r.name).join(', ')}{' '}
                {payrollOutstanding.length === 1 ? "hasn't" : "haven't"} finished {monthLabel.split(' ')[0]} yet —
                these invoices may still be missing exams. Check the Payroll page before sending.
              </span>
            </div>
          )}

          <p className="wl-summary">
            {ready.length > 0 ? (
              <><strong>{ready.length} {ready.length === 1 ? 'client is' : 'clients are'} ready to invoice.</strong> Open each one, then print or email it.</>
            ) : (
              <>All {done.length} {done.length === 1 ? 'client' : 'clients'} for {monthLabel} have been sent. You're all caught up.</>
            )}
          </p>

          <div className="wl-list">
            {ready.map((ent) => (
              <ClientRow key={ent.name} ent={ent} onOpen={() => setSelectedOrg(ent.name)} />
            ))}
          </div>

          {done.length > 0 && (
            <>
              <div className="wl-divider"><span>Already sent</span></div>
              <div className="wl-list">
                {done.map((ent) => (
                  <ClientRow key={ent.name} ent={ent} onOpen={() => setSelectedOrg(ent.name)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ClientRow({ ent, onOpen }) {
  const isSent = Boolean(ent.sent)
  return (
    <button className={`wl-row${isSent ? ' sent' : ''}`} onClick={onOpen}>
      <div className="wl-row-main">
        <span className="wl-row-name">{ent.name}</span>
        <span className="wl-row-sub">
          {ent.count} {ent.count === 1 ? 'exam' : 'exams'} · <strong>${money(ent.due)} to bill</strong>
        </span>
      </div>
      {isSent ? (
        <span className="wl-pill sent">✓ Sent {format(parseISO(ent.sent.sent_at), 'MMM d')}</span>
      ) : (
        <span className="wl-pill ready">Ready to send</span>
      )}
      <span className="wl-chev" aria-hidden="true">›</span>
    </button>
  )
}

function InvoiceDetail({ org, month, monthLabel, exams, amountOf, copayOf, sent, onMarkSent, onUnmark, onBack }) {
  const [editing, setEditing] = useState(false)
  const [emailPanel, setEmailPanel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const base = useMemo(
    () => exams.map((e) => ({ id: e.id, date: e.exam_date, type: e.exam_type, name: e.client_name, amount: amountOf(e), copay: copayOf(e) })),
    [exams, amountOf, copayOf]
  )
  const [lines, setLines] = useState([])
  useEffect(() => { setLines(base) }, [base])

  const editLine = (id, field, value) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [field]: value } : l)))

  const totals = lines.reduce((acc, l) => {
    const a = Number(l.amount) || 0, c = Number(l.copay) || 0
    acc.amount += a; acc.copay += c; acc.due += a - c
    return acc
  }, { amount: 0, copay: 0, due: 0 })

  const [y, m] = month.split('-')
  const invoiceNumber = `S${y.slice(2)}-${orgCode(org)}-${Number(m)}`
  const billTo = orgBillTo(org)
  const emails = orgEmails(org)

  async function mark(method) {
    setBusy(true); setErr('')
    const { error } = await onMarkSent({ organization: org, month, invoice_no: invoiceNumber, method })
    setBusy(false)
    if (error) setErr(error)
  }

  async function undo() {
    setBusy(true); setErr('')
    const { error } = await onUnmark({ organization: org, month })
    setBusy(false)
    if (error) setErr(error)
  }

  function openEmail() {
    const subject = `SAPPS Invoice ${invoiceNumber} — ${org}, ${monthLabel}`
    const body =
      `Please find attached SAPPS invoice ${invoiceNumber} for ${org}, ${monthLabel}.\n\n` +
      `Total amount due: $${money(totals.due)}\n\n` +
      `Thank you,\n${COMPANY.name}`
    try {
      window.location.href = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } catch (_) { /* sandbox may block mailto; the mark still records it */ }
    mark('email')
    setEmailPanel(false)
  }

  return (
    <div className="invoice-screen">
      {/* Top bar (screen only) */}
      <div className="iv-topbar">
        <button className="iv-back" onClick={onBack}>‹ All {monthLabel} clients</button>
        <span className="iv-context">{org}</span>
      </div>

      {err && <div className="iv-error">{err}</div>}

      {/* Fix-a-number escape hatch (screen only) */}
      <div className="iv-fixrow">
        <button className={`btn-fix${editing ? ' on' : ''}`} onClick={() => setEditing((v) => !v)}>
          {editing ? '✓ Done fixing' : '✎ Fix a number'}
        </button>
      </div>

      {/* The invoice sheet — unchanged from the printed original */}
      <div className="invoice-sheet">
        <header className="inv-letterhead">
          <img className="inv-logo" src="/SAPPS_isotype_gold.svg" alt="SAPPS" />
          <div className="inv-company">
            <div className="inv-company-name">{COMPANY.name}</div>
            {COMPANY.addressLines.map((l, i) => <div key={i} className="inv-company-line">{l}</div>)}
            <div className="inv-company-line">{COMPANY.phones}</div>
          </div>
        </header>

        <div className="inv-rule" />

        <div className="inv-meta-row">
          <div className="inv-billto">
            <div className="inv-label">Bill To</div>
            {billTo.map((l, i) => <div key={i} className={i === 0 ? 'inv-billto-name' : 'inv-billto-line'}>{l}</div>)}
          </div>
          <div className="inv-meta">
            <div><span>Invoice #</span><strong>{invoiceNumber}</strong></div>
            <div><span>Month of Services</span><strong>{MONTHS[Number(m)]}</strong></div>
            <div><span>Date of Invoice</span><strong>{format(new Date(), 'M/d/yy')}</strong></div>
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Date of Exam</th><th>Type of Exam</th><th>Client's Name</th>
              <th className="r">Amount of Exam</th><th className="r">Copay</th><th className="r">Total Amount Due</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{format(parseISO(l.date), 'M/d/yy')}</td>
                <td>{l.type}</td>
                <td className="inv-name">{l.name}</td>
                <td className="r">
                  <span className="inv-dollar">$</span>
                  {editing
                    ? <input className="inv-edit" type="number" step="0.01" min="0" value={l.amount} onChange={(e) => editLine(l.id, 'amount', e.target.value)} />
                    : money(l.amount)}
                </td>
                <td className="r">
                  <span className="inv-dollar">$</span>
                  {editing
                    ? <input className="inv-edit" type="number" step="0.01" min="0" value={l.copay} onChange={(e) => editLine(l.id, 'copay', e.target.value)} />
                    : money(l.copay)}
                </td>
                <td className="r inv-due">${money((Number(l.amount) || 0) - (Number(l.copay) || 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="inv-total-label">Total Amounts</td>
              <td className="r">${money(totals.amount)}</td>
              <td className="r">${money(totals.copay)}</td>
              <td className="r inv-grand">${money(totals.due)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="inv-thanks">Thank you for your business!</div>
      </div>

      {/* Actions (screen only) */}
      {sent ? (
        <div className="iv-sentstrip">
          <span className="iv-sent-check" aria-hidden="true">✓</span>
          <span className="iv-sent-text">
            Sent {format(parseISO(sent.sent_at), 'MMMM d')}{sent.method ? ` · ${sent.method === 'email' ? 'emailed' : 'printed'}` : ''}
          </span>
          <div className="iv-sent-actions">
            <button className="btn-xl print" onClick={() => window.print()}>🖨  Print again</button>
            <button className="iv-undo" onClick={undo} disabled={busy}>Undo</button>
          </div>
        </div>
      ) : emailPanel ? (
        <div className="email-panel">
          <div className="email-panel-title">Email this invoice</div>
          {emails.length === 0 ? (
            <div className="email-panel-warn">No billing email on file for {org}. Add one to the directory, or print and mail instead.</div>
          ) : (
            <>
              <div className="email-panel-label">Goes to</div>
              {emails.map((e) => <div key={e} className="email-panel-to">{e}</div>)}
              <div className="email-panel-label">Subject</div>
              <div className="email-panel-subject">SAPPS Invoice {invoiceNumber} — {org}, {monthLabel}</div>
              <div className="email-panel-hint">Tip: Save the PDF first with “Print / Save PDF,” then attach it to the email that opens.</div>
            </>
          )}
          <div className="email-panel-actions">
            <button className="btn-xl ghost" onClick={() => setEmailPanel(false)}>Back</button>
            <button className="btn-xl email" onClick={openEmail} disabled={busy || emails.length === 0}>
              Open email &amp; mark sent
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="iv-actions">
            <button className="btn-xl print" onClick={() => window.print()} disabled={lines.length === 0}>
              🖨  Print / Save PDF
            </button>
            <button className="btn-xl email" onClick={() => setEmailPanel(true)} disabled={lines.length === 0}>
              ✉  Email to client
            </button>
          </div>
          <div className="iv-marksent">
            <button className="btn-marksent" onClick={() => mark('print')} disabled={busy || lines.length === 0}>
              ✓ Mark this invoice as sent
            </button>
            <span className="iv-hint">Tap this once you've printed or emailed it.</span>
          </div>
        </>
      )}
    </div>
  )
}
