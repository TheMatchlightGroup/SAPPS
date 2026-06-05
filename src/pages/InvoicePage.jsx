import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { useInvoiceData } from '../hooks/useInvoiceData'
import { COMPANY, TEST_TYPE_ABBR, orgCode, orgBillTo } from '../lib/constants'
import '../styles/invoice.css'

const money = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const thisMonth = () => new Date().toISOString().slice(0, 7) // YYYY-MM

export default function InvoicePage() {
  const { exams, intakeByExam, billableOrgs, loading } = useInvoiceData()
  const [org, setOrg] = useState('')
  const [month, setMonth] = useState(thisMonth())
  const [lines, setLines] = useState([])

  // Default to the first billable org once data loads.
  useEffect(() => {
    if (!org && billableOrgs.length) setOrg(billableOrgs[0])
  }, [billableOrgs, org])

  // Build editable invoice lines for the chosen org + month.
  const baseLines = useMemo(() => {
    if (!org) return []
    return exams
      .filter((e) => e.organization === org && e.exam_date.startsWith(month))
      .map((e) => {
        const f = intakeByExam[e.id] || {}
        const amount = (Number(f.amount_due_examiner) || 0) + (Number(f.amount_due_sapps) || 0)
        const copay = Number(f.copay_amount) || 0
        return { id: e.id, date: e.exam_date, type: e.exam_type, name: e.client_name, amount, copay }
      })
  }, [exams, intakeByExam, org, month])

  useEffect(() => { setLines(baseLines) }, [baseLines])

  const editLine = (id, field, value) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [field]: value } : l)))

  const totals = lines.reduce(
    (acc, l) => {
      const a = Number(l.amount) || 0, c = Number(l.copay) || 0
      acc.amount += a; acc.copay += c; acc.due += a - c
      return acc
    },
    { amount: 0, copay: 0, due: 0 }
  )

  const [y, m] = month.split('-')
  const invoiceNumber = org ? `S${y.slice(2)}-${orgCode(org)}-${Number(m)}` : ''
  const billTo = org ? orgBillTo(org) : []

  return (
    <div className="invoice-screen">
      {/* Controls — not printed */}
      <div className="invoice-controls">
        <div className="control">
          <label>Organization</label>
          <select value={org} onChange={(e) => setOrg(e.target.value)}>
            {billableOrgs.length === 0 && <option value="">No completed exams yet</option>}
            {billableOrgs.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="control">
          <label>Month of services</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button className="btn btn-primary big" onClick={() => window.print()} disabled={lines.length === 0}>
          Approve &amp; Print / Save PDF
        </button>
      </div>

      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : lines.length === 0 ? (
        <div className="cal-empty">
          No completed exams for {org || 'this organization'} in {MONTHS[Number(m)]} {y}. Pick another month or organization.
        </div>
      ) : (
        <div className="invoice-sheet">
          {/* Letterhead */}
          <header className="inv-letterhead">
            <img className="inv-logo" src="/SAPPS_isotype_gold.svg" alt="SAPPS" />
            <div className="inv-company">
              <div className="inv-company-name">{COMPANY.name}</div>
              {COMPANY.addressLines.map((l, i) => <div key={i} className="inv-company-line">{l}</div>)}
              <div className="inv-company-line">{COMPANY.phones}</div>
            </div>
          </header>

          <div className="inv-rule" />

          {/* Bill-to + meta */}
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

          {/* Line items */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>Date of Exam</th>
                <th>Type of Exam</th>
                <th>Client's Name</th>
                <th className="r">Amount of Exam</th>
                <th className="r">Copay</th>
                <th className="r">Total Amount Due</th>
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
                    <input className="inv-edit" type="number" step="0.01" min="0"
                      value={l.amount} onChange={(e) => editLine(l.id, 'amount', e.target.value)} />
                  </td>
                  <td className="r">
                    <span className="inv-dollar">$</span>
                    <input className="inv-edit" type="number" step="0.01" min="0"
                      value={l.copay} onChange={(e) => editLine(l.id, 'copay', e.target.value)} />
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
      )}
    </div>
  )
}
