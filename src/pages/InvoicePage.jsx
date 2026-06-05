import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useInvoiceData } from '../hooks/useInvoiceData'
import { COMPANY, TEST_TYPE_ABBR, orgCode, orgBillTo } from '../lib/constants'
import '../styles/invoice.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const thisMonth = () => new Date().toISOString().slice(0, 7)

export default function InvoicePage() {
  const { exams, intakeByExam, loading } = useInvoiceData()
  const [month, setMonth] = useState(thisMonth())
  const [selectedOrg, setSelectedOrg] = useState(null)

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

  // One directory entry per entity with work this month.
  const entities = useMemo(() => {
    const map = {}
    for (const e of monthExams) {
      const o = (map[e.organization] ||= { name: e.organization, count: 0, due: 0 })
      o.count += 1
      o.due += amountOf(e) - copayOf(e)
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [monthExams]) // eslint-disable-line react-hooks/exhaustive-deps

  const [y, m] = month.split('-')

  if (selectedOrg) {
    return (
      <InvoiceDetail
        org={selectedOrg}
        month={month}
        exams={monthExams.filter((e) => e.organization === selectedOrg)}
        amountOf={amountOf}
        copayOf={copayOf}
        onBack={() => setSelectedOrg(null)}
      />
    )
  }

  return (
    <div className="invoice-screen">
      <div className="invoice-controls">
        <div className="control">
          <label>Billing month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="dir-caption">Select an entity to review and invoice</div>
      </div>

      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : entities.length === 0 ? (
        <div className="cal-empty">No completed exams in {MONTHS[Number(m)]} {y}. Pick another month.</div>
      ) : (
        <div className="entity-list">
          {entities.map((ent) => (
            <button key={ent.name} className="entity-row" onClick={() => setSelectedOrg(ent.name)}>
              <div className="entity-main">
                <span className="entity-name">{ent.name}</span>
                <span className="entity-code">{orgCode(ent.name)}</span>
              </div>
              <div className="entity-meta">
                <span className="entity-count">{ent.count} {ent.count === 1 ? 'exam' : 'exams'}</span>
                <span className="entity-due">${money(ent.due)}</span>
                <span className="entity-chev" aria-hidden="true">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceDetail({ org, month, exams, amountOf, copayOf, onBack }) {
  const [lines, setLines] = useState([])
  const base = useMemo(
    () => exams.map((e) => ({ id: e.id, date: e.exam_date, type: e.exam_type, name: e.client_name, amount: amountOf(e), copay: copayOf(e) })),
    [exams, amountOf, copayOf]
  )
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

  return (
    <div className="invoice-screen">
      <div className="invoice-controls">
        <button className="btn btn-ghost back-btn" onClick={onBack}>← All entities</button>
        <div className="dir-caption">{org} · {MONTHS[Number(m)]} {y}</div>
        <button className="btn btn-primary big" onClick={() => window.print()} disabled={lines.length === 0}>
          Approve &amp; Print / Save PDF
        </button>
      </div>

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
                <td className="r"><span className="inv-dollar">$</span>
                  <input className="inv-edit" type="number" step="0.01" min="0" value={l.amount} onChange={(e) => editLine(l.id, 'amount', e.target.value)} /></td>
                <td className="r"><span className="inv-dollar">$</span>
                  <input className="inv-edit" type="number" step="0.01" min="0" value={l.copay} onChange={(e) => editLine(l.id, 'copay', e.target.value)} /></td>
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
    </div>
  )
}
