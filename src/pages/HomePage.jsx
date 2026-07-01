import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHomeData } from '../hooks/useHomeData'
import '../styles/home.css'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { readyToInvoice, invoiced, totalOrgs, weeks, monthName, loading } = useHomeData()

  const first = profile?.name ? profile.name.split(' ')[0] : ''
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="home">
      <header className="home-head">
        <h2>{greeting()}{first ? `, ${first}` : ''}.</h2>
        <p className="home-date">{today}</p>
      </header>

      <div className="home-tiles">
        {/* Invoicing — the main action, so it leads */}
        <button className="home-tile primary" onClick={() => navigate('/invoicing')}>
          <span className="tile-eyebrow">Invoicing</span>
          <span className="tile-headline">
            {loading ? '…'
              : readyToInvoice > 0
                ? `${readyToInvoice} ${readyToInvoice === 1 ? 'client' : 'clients'} ready to invoice`
                : totalOrgs > 0 ? `All caught up for ${monthName}`
                  : 'Nothing to invoice yet'}
          </span>
          <span className="tile-sub">
            {loading ? '\u00A0'
              : readyToInvoice > 0 ? `for ${monthName} — open each one and print or email it`
                : totalOrgs > 0 ? `${invoiced} already sent this month`
                  : 'Completed exams show up here, grouped by client'}
          </span>
          <span className="tile-go">Go to Invoicing →</span>
        </button>

        {/* Payroll */}
        <button className="home-tile" onClick={() => navigate('/payroll')}>
          <span className="tile-eyebrow">Payroll</span>
          <span className="tile-headline">
            {loading ? '…' : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} submitted`}
          </span>
          <span className="tile-sub">
            {loading ? '\u00A0' : weeks > 0 ? 'this month — ready to export' : 'submitted weeks show up here'}
          </span>
          <span className="tile-go">Go to Payroll →</span>
        </button>

        {/* Calendar */}
        <button className="home-tile" onClick={() => navigate('/')}>
          <span className="tile-eyebrow">Calendar</span>
          <span className="tile-headline">View the schedule</span>
          <span className="tile-sub">Bookings, exam status, and week submissions</span>
          <span className="tile-go">Open the calendar →</span>
        </button>
      </div>
    </div>
  )
}
