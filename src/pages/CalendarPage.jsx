import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, parseISO,
} from 'date-fns'
import { useCalendarData } from '../hooks/useCalendarData'
import { TEST_TYPE_ABBR } from '../lib/constants'
import BookingModal from '../components/BookingModal'
import '../styles/calendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const { exams, examiners, examinerName, loading, error, createBooking } = useCalendarData()
  const [view, setView] = useState('month') // 'month' | 'agenda'
  const [cursor, setCursor] = useState(new Date())
  const [modalDate, setModalDate] = useState(null) // non-null => modal open

  // exam_date -> exams[] for fast day-cell lookup
  const examsByDate = useMemo(() => {
    const map = {}
    for (const ex of exams) (map[ex.exam_date] ||= []).push(ex)
    return map
  }, [exams])

  const openNew = (dateISO) => setModalDate(dateISO || format(new Date(), 'yyyy-MM-dd'))

  return (
    <div>
      <div className="cal-toolbar">
        <div className="cal-title">
          <h2>Polygraph Calendar</h2>
        </div>
        <div className="cal-controls">
          <div className="view-toggle">
            <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'agenda' ? 'on' : ''} onClick={() => setView('agenda')}>Agenda</button>
          </div>
          <button className="btn btn-primary" onClick={() => openNew()}>+ New Booking</button>
        </div>
      </div>

      {error && <div className="cal-error">Couldn't load exams: {error}</div>}
      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : view === 'month' ? (
        <MonthView
          cursor={cursor} setCursor={setCursor}
          examsByDate={examsByDate} examinerName={examinerName}
          onDayClick={openNew}
        />
      ) : (
        <AgendaView exams={exams} examinerName={examinerName} onNew={() => openNew()} />
      )}

      {modalDate && (
        <BookingModal
          examiners={examiners}
          defaultDate={modalDate}
          onClose={() => setModalDate(null)}
          onCreate={createBooking}
        />
      )}
    </div>
  )
}

function MonthView({ cursor, setCursor, examsByDate, examinerName, onDayClick }) {
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  return (
    <>
      <div className="month-nav">
        <button className="navbtn" onClick={() => setCursor(subMonths(cursor, 1))}>← Previous</button>
        <span className="month-label">{format(cursor, 'MMMM yyyy')}</span>
        <button className="navbtn" onClick={() => setCursor(addMonths(cursor, 1))}>Next →</button>
      </div>

      <div className="month-grid">
        {WEEKDAYS.map((d) => <div key={d} className="dow">{d}</div>)}
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const dayExams = examsByDate[iso] || []
          const muted = !isSameMonth(day, cursor)
          const today = isSameDay(day, new Date())
          return (
            <div
              key={iso}
              className={`day-cell${muted ? ' muted' : ''}${today ? ' today' : ''}`}
              onClick={() => onDayClick(iso)}
            >
              <span className="day-num">{format(day, 'd')}</span>
              <div className="day-exams">
                {dayExams.slice(0, 3).map((ex) => (
                  <div key={ex.id} className={`chip${ex.status === 'completed' ? ' done' : ''}`}
                    title={`${ex.client_name} • ${ex.exam_type} • ${examinerName(ex.examiner_id)}`}>
                    <span className="chip-time">{ex.exam_time?.slice(0, 5)}</span>
                    {ex.client_name}
                  </div>
                ))}
                {dayExams.length > 3 && <div className="chip-more">+{dayExams.length - 3} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function AgendaView({ exams, examinerName, onNew }) {
  if (exams.length === 0) {
    return (
      <div className="cal-empty">
        No bookings yet. <button className="link" onClick={onNew}>Create the first one →</button>
      </div>
    )
  }
  return (
    <div className="agenda">
      {exams.map((ex) => (
        <div key={ex.id} className="agenda-row">
          <div className="agenda-when">
            <span className="agenda-date">{format(parseISO(ex.exam_date), 'EEE, MMM d')}</span>
            <span className="agenda-time">{ex.exam_time?.slice(0, 5)}</span>
          </div>
          <div className="agenda-main">
            <span className="agenda-name">{ex.client_name}</span>
            <span className="agenda-meta">
              {ex.organization} · {TEST_TYPE_ABBR[ex.exam_type] || ex.exam_type} · {ex.duration_minutes}min
            </span>
          </div>
          <div className="agenda-side">
            <span className="agenda-examiner">{examinerName(ex.examiner_id)}</span>
            <span className={`status-pill ${ex.status}`}>{ex.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
