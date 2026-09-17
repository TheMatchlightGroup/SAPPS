import { useState, useMemo, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { useInvoiceData } from '../hooks/useInvoiceData'
import { COMPANY, orgCode, orgBillTo, orgEmails } from '../lib/constants'
import { gmailComposeUrl, mailtoUrl, copyEmailToClipboard } from '../lib/emailLinks'
import '../styles/invoice.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const thisMonth = () => {
  const d = new Date() // local month, not UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Shift a 'YYYY-MM' string by whole months.
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function InvoicePage() {
  const { exams, intakeByExam, loading, sentStatus, markInvoiceSent, unmarkInvoiceSent, monthCloseFor, poFor, savePo, detailsFor, saveDetails } = useInvoiceData()
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
        savedPo={poFor(selectedOrg)}
        onSavePo={savePo}
        savedDetails={detailsFor(selectedOrg, month)}
        onSaveDetails={saveDetails}
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

function InvoiceDetail({ org, month, monthLabel, exams, amountOf, copayOf, sent, savedPo, onSavePo, savedDetails, onSaveDetails, onMarkSent, onUnmark, onBack }) {
  const [editing, setEditing] = useState(false)
  const [emailPanel, setEmailPanel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // PO number — some clients (VCBR, PWAD, SOPMU) now require one on the
  // invoice. Saved per organization: type it once in "Fix a number" mode and
  // it stays on every invoice for that client. Blank = the line doesn't print.
  const [po, setPo] = useState(savedPo || '')
  useEffect(() => { setPo(savedPo || '') }, [savedPo, org])

  async function persistPo() {
    if ((po || '').trim() === (savedPo || '').trim()) return
    const { error } = await onSavePo(org, po)
    if (error) setErr(error)
  }

  // "Done fixing" also commits the PO — one tap ends the whole edit.
  function toggleEditing() {
    if (editing) persistPo()
    setEditing((v) => !v)
  }

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
  const billTo = orgBillTo(org)
  const emails = orgEmails(org)

  // ---- Invoice header: pre-filled, editable via the pencil ----
  // Defaults: number from the org code, label from the month, date = today
  // (or the day it was marked sent, so re-prints don't drift). Any field
  // payroll edits is saved per org+month and overrides the default.
  const defaults = {
    invoice_no: `S${y.slice(2)}-${orgCode(org)}-${Number(m)}`,
    services_label: MONTHS[Number(m)],
    invoice_date: sent?.sent_at ? format(parseISO(sent.sent_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  }
  const effective = {
    invoice_no: savedDetails?.invoice_no || defaults.invoice_no,
    services_label: savedDetails?.services_label || defaults.services_label,
    invoice_date: savedDetails?.invoice_date || defaults.invoice_date,
  }
  const invoiceNumber = effective.invoice_no

  const [metaEditing, setMetaEditing] = useState(false)
  const [meta, setMeta] = useState(effective)
  const metaRef = useRef(null)
  useEffect(() => { if (!metaEditing) setMeta(effective) }, [savedDetails, org, month, sent]) // eslint-disable-line react-hooks/exhaustive-deps

  async function commitMeta() {
    setMetaEditing(false)
    const changed = ['invoice_no', 'services_label', 'invoice_date'].some((k) => (meta[k] || '') !== (effective[k] || ''))
    if (!changed) return
    const { error } = await onSaveDetails({ organization: org, month, ...meta })
    if (error) setErr(error)
  }
  function cancelMeta() { setMeta(effective); setMetaEditing(false) }
  function metaKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitMeta() }
    if (e.key === 'Escape') { e.preventDefault(); cancelMeta() }
  }
  const prettyDate = (iso) => { try { return format(parseISO(iso), 'M/d/yy') } catch { return iso } }

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

  const [copied, setCopied] = useState(false)

  const emailParts = () => ({
    to: emails.join(','),
    subject: `SAPPS Invoice ${invoiceNumber} — ${org}, ${monthLabel}`,
    body:
      `Please find attached SAPPS invoice ${invoiceNumber} for ${org}, ${monthLabel}.\n\n` +
      `Total amount due: $${money(totals.due)}\n\n` +
      `Thank you,\n${COMPANY.name}`,
  })

  // Open the pre-written email wherever the admin actually works, then record it.
  function openVia(kind) {
    const parts = emailParts()
    try {
      if (kind === 'gmail') window.open(gmailComposeUrl(parts), '_blank', 'noopener')
      else window.location.href = mailtoUrl(parts)
    } catch (_) { /* sandbox may block; the mark still records it */ }
    mark('email')
    setEmailPanel(false)
  }

  // Copy for pasting into any client. Doesn't auto-mark — nothing was sent yet.
  async function copyMessage() {
    try {
      await copyEmailToClipboard(emailParts())
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (_) { /* clipboard blocked; other options remain */ }
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
        <button className={`btn-fix${editing ? ' on' : ''}`} onClick={toggleEditing}>
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
          <div className={`inv-meta${metaEditing ? ' editing' : ''}`} ref={metaRef}>
            {!metaEditing && (
              <button className="inv-meta-pencil" type="button" title="Edit invoice number, month, or date" aria-label="Edit invoice details" onClick={() => setMetaEditing(true)}>✎</button>
            )}
            {metaEditing ? (
              <>
                <div className="inv-meta-edit"><span>Invoice #</span>
                  <input className="inv-edit" type="text" value={meta.invoice_no} onChange={(e) => setMeta({ ...meta, invoice_no: e.target.value })} onKeyDown={metaKey} autoFocus />
                </div>
                <div className="inv-meta-edit"><span>Month of Services</span>
                  <input className="inv-edit" type="text" value={meta.services_label} onChange={(e) => setMeta({ ...meta, services_label: e.target.value })} onKeyDown={metaKey} />
                </div>
                <div className="inv-meta-edit"><span>Date of Invoice</span>
                  <input className="inv-edit" type="date" value={meta.invoice_date} onChange={(e) => setMeta({ ...meta, invoice_date: e.target.value })} onKeyDown={metaKey} />
                </div>
                <div className="inv-meta-edit"><span>PO Number</span>
                  <input className="inv-edit" type="text" placeholder="none" value={po} onChange={(e) => setPo(e.target.value)} onBlur={persistPo} onKeyDown={metaKey} />
                </div>
                <div className="inv-meta-actions">
                  <button type="button" className="btn-meta ghost" onClick={cancelMeta}>Cancel</button>
                  <button type="button" className="btn-meta" onClick={() => { persistPo(); commitMeta() }}>✓ Done</button>
                </div>
              </>
            ) : (
              <>
                <div><span>Invoice #</span><strong>{effective.invoice_no}</strong></div>
                <div><span>Month of Services</span><strong>{effective.services_label}</strong></div>
                <div><span>Date of Invoice</span><strong>{prettyDate(effective.invoice_date)}</strong></div>
                {editing ? (
                  <div className="inv-po-edit">
                    <span>PO Number</span>
                    <input className="inv-edit" type="text" placeholder="none" value={po} onChange={(e) => setPo(e.target.value)} onBlur={persistPo} />
                  </div>
                ) : po.trim() ? (
                  <div><span>PO Number</span><strong>{po.trim()}</strong></div>
                ) : null}
              </>
            )}
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
            <button className="btn-xl email" onClick={() => openVia('gmail')} disabled={busy || emails.length === 0}>
              Open in Gmail
            </button>
            <button className="btn-xl email alt" onClick={() => openVia('mailto')} disabled={busy || emails.length === 0}>
              Open in Mail app
            </button>
            <button className="btn-xl ghost" onClick={copyMessage} disabled={emails.length === 0}>
              {copied ? '✓ Copied' : 'Copy message'}
            </button>
          </div>
          {copied && (
            <div className="email-panel-hint">
              Copied — paste it into your email client, attach the PDF, then tap “Mark this invoice as sent.”
            </div>
          )}
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
