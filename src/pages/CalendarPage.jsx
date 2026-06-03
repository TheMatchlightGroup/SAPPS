import { useAuth } from '../context/AuthContext'

// STUB — the real month/week/day/agenda calendar + booking/completion
// flow lands in the next build step. This just proves auth + routing.
export default function CalendarPage() {
  const { profile } = useAuth()
  return (
    <div>
      <div className="page-head">
        <h2>Polygraph Calendar</h2>
        <p>
          Welcome{profile?.name ? `, ${profile.name}` : ''}. This is where bookings,
          exam completion, and weekly submission will live.
        </p>
      </div>
      <div className="stub-card">
        <span className="tag">Next build step</span>
        <p style={{ margin: 0 }}>
          Calendar views (month / week / day / agenda), the New Booking modal,
          and the exam-completion financials form attach here.
        </p>
      </div>
    </div>
  )
}
