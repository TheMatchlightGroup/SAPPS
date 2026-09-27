import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, addDays, parseISO,
} from 'date-fns'
import { useCalendarData } from '../hooks/useCalendarData'
import { useAuth } from '../context/AuthContext'
import { TEST_TYPE_ABBR } from '../lib/constants'
import { isOffice as isOfficeRole, isAdmin } from '../lib/roles'
import { tint } from '../lib/examinerColors'
import BookingModal from '../components/BookingModal'
import CompletionModal from '../components/CompletionModal'
import WeekSummaryPanel from '../components/WeekSummaryPanel'
import ExaminerKey from '../components/ExaminerKey'
import DayDrawer from '../components/DayDrawer'
import '../styles/calendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 3

export default function CalendarPage() {
  const {
    exams, examiners, examinerName, examinerColor, intakeByExam, reportByExam, weekSubmissions,
    loading, error,
    createBooking, updateBooking, fetchIntake, completeExam, deleteExam, submitWeek,
    waiveReport, unwaiveReport,
    availability, changeAvailability, setAvailabilityNote, setExaminerColor,
  } = useCalendarData()

  const { role } = useAuth()
  // Scheduling + availability are office-only (Tier 3). Examiners and team
  // leads are read-only on the schedule; everyone can open the day drawer.
  const isOffice = isOfficeRole(role)
  const canBook = isOffice
  const showAvailability = isOffice

  const [view, setView] = useState('month') // 'month' | 'agenda'
  const [cursor, setCursor] = useState(new Date())
  const [modal, setModal] = useState(null) // { type:'new', date } | { type:'complete', exam } | { type:'edit', exam }
  const [drawerDate, setDrawerDate] = useState(null)
  const [paint, setPaint] = useState(false)
  const [brush, setBrush] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [availError, setAvailError] = useState('')

  const examsByDate = useMemo(() => {
    const map = {}
    for (const ex of exams) (map[ex.exam_date] ||= []).push(ex)
    return map
  }, [exams])

  // date -> [{ examiner, note }] in roster order (active examiners only).
  const availableByDate = useMemo(() => {
    const order = new Map(examiners.map((e, i) => [e.id, i]))
    const map = {}
    for (const a of Object.values(availability)) {
      if (!order.has(a.examiner_id)) continue
      ;(map[a.date] ||= []).push({ examiner: examiners[order.get(a.examiner_id)], note: a.note })
    }
    for (const list of Object.values(map)) list.sort((x, y) => order.get(x.examiner.id) - order.get(y.examiner.id))
    return map
  }, [availability, examiners])

  const isAvailable = useCallback((examinerId, date) => availability[`${examinerId}__${date}`] || null, [availability])

  const change = useCallback(async (batch) => {
    setAvailError('')
    const res = await changeAvailability(batch)
    if (res.error) setAvailError(`Couldn't save availability: ${res.error}`)
    return res
  }, [changeAvailability])

  const openNew = (dateISO) => {
    if (!canBook) return
    setModal({ type: 'new', date: dateISO || format(new Date(), 'yyyy-MM-dd') })
  }
  const openComplete = (exam) => setModal({ type: 'complete', exam })
  const closeModal = () => setModal(null)
  const openDay = (iso) => setDrawerDate(iso)

  function togglePaint() {
    if (!paint) {
      setFocusId(null)
      setDrawerDate(null)
      setView('month')
      if (!brush) setBrush(examiners[0]?.id || null)
    }
    setPaint(!paint)
  }

  // Esc: close the top-most layer (modals handle their own clicks; the
  // drawer and paint mode close here).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || modal) return
      if (drawerDate) setDrawerDate(null)
      else if (paint) setPaint(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, drawerDate, paint])

  const drawerExams = useMemo(
    () => (drawerDate ? [...(examsByDate[drawerDate] || [])].sort((a, b) => (a.exam_time || '').localeCompare(b.exam_time || '')) : []),
    [drawerDate, examsByDate]
  )

  return (
    <div>
      <WeekSummaryPanel
        exams={exams}
        examiners={examiners}
        intakeByExam={intakeByExam}
        reportByExam={reportByExam}
        weekSubmissions={weekSubmissions}
        submitWeek={submitWeek}
      />

      <div className="cal-toolbar">
        <div className="cal-title"><h2>Polygraph Calendar</h2></div>
        <div className="cal-controls">
          <div className="view-toggle">
            <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'agenda' ? 'on' : ''} onClick={() => { setView('agenda'); setPaint(false) }}>Agenda</button>
          </div>
          {canBook && (
            <button className="btn btn-primary" onClick={() => openNew()}>+ New Booking</button>
          )}
        </div>
      </div>

      {error && <div className="cal-error">Couldn't load exams: {error}</div>}
      {availError && <div className="cal-error">{availError}</div>}

      {loading ? (
        <div className="cal-empty">Loading…</div>
      ) : view === 'month' ? (
        <>
          {showAvailability && examiners.length > 0 && (
            <ExaminerKey
              examiners={examiners}
              cursor={cursor}
              availability={availability}
              paint={paint}
              onTogglePaint={togglePaint}
              brush={brush}
              onBrush={setBrush}
              focusId={focusId}
              onFocus={setFocusId}
              onChange={change}
              onColor={setExaminerColor}
              canColor={isAdmin(role)}
            />
          )}
          <MonthView
            cursor={cursor} setCursor={setCursor}
            examsByDate={examsByDate} examinerName={examinerName} examinerColor={examinerColor}
            availableByDate={showAvailability ? availableByDate : {}}
            focusId={focusId}
            paint={paint} brush={examiners.find((e) => e.id === brush) || null}
            isAvailable={isAvailable} onStroke={change}
            onDayOpen={openDay} onExamClick={openComplete}
          />
        </>
      ) : (
        <AgendaView
          exams={exams} examinerName={examinerName} examinerColor={examinerColor}
          canBook={canBook}
          onNew={() => openNew()} onExamClick={openComplete}
        />
      )}

      {drawerDate && (
        <DayDrawer
          date={drawerDate}
          onClose={() => setDrawerDate(null)}
          onShiftDay={(n) => setDrawerDate((d) => format(addDays(parseISO(d), n), 'yyyy-MM-dd'))}
          exams={drawerExams}
          examiners={examiners}
          examinerName={examinerName}
          examinerColor={examinerColor}
          showAvailability={showAvailability}
          availableFor={(id) => isAvailable(id, drawerDate)}
          onToggleAvailable={(id, on) => change(on ? { adds: [{ examiner_id: id, date: drawerDate }] } : { removes: [{ examiner_id: id, date: drawerDate }] })}
          onNote={async (id, note) => {
            const { error: e } = await setAvailabilityNote(id, drawerDate, note)
            if (e) setAvailError(`Couldn't save note: ${e}`)
          }}
          canBook={canBook}
          onNewBooking={(iso) => openNew(iso)}
          onExamClick={openComplete}
        />
      )}

      {modal?.type === 'new' && canBook && (
        <BookingModal
          examiners={examiners}
          defaultDate={modal.date}
          isAvailable={showAvailability ? isAvailable : null}
          hasAvailabilityFor={(iso) => Object.keys(availableByDate).some((k) => k.slice(0, 7) === iso.slice(0, 7))}
          onClose={closeModal}
          onSave={createBooking}
        />
      )}
      {modal?.type === 'edit' && isOffice && (
        <BookingModal
          examiners={examiners}
          exam={modal.exam}
          isAvailable={showAvailability ? isAvailable : null}
          hasAvailabilityFor={(iso) => Object.keys(availableByDate).some((k) => k.slice(0, 7) === iso.slice(0, 7))}
          onClose={closeModal}
          onSave={(form) => updateBooking(modal.exam.id, form)}
        />
      )}
      {modal?.type === 'complete' && (
        <CompletionModal
          exam={modal.exam}
          examinerName={examinerName}
          fetchIntake={fetchIntake}
          onComplete={completeExam}
          onDelete={deleteExam}
          onClose={closeModal}
          canDelete={isOffice}
          canEditBooking={isOffice}
          onEditBooking={(exam) => setModal({ type: 'edit', exam })}
          report={reportByExam[modal.exam.id] || null}
          onWaiveReport={waiveReport}
          onUnwaiveReport={unwaiveReport}
        />
      )}
    </div>
  )
}

function MonthView({
  cursor, setCursor, examsByDate, examinerName, examinerColor,
  availableByDate, focusId, paint, brush, isAvailable, onStroke,
  onDayOpen, onExamClick,
}) {
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  // ---- Paint strokes ----
  // Press on a day: if the brush examiner isn't available there, the stroke
  // ADDS; if they are, it REMOVES. Drag across more days to extend the
  // stroke (mouse or finger). Days change color instantly; one save goes
  // out when the stroke ends.
  const stroke = useRef(null) // { mode: 'add'|'remove' }
  const [pending, setPendingState] = useState({}) // date -> true(add) / false(remove)
  const pendingRef = useRef({})
  const setPending = (next) => { pendingRef.current = next; setPendingState(next) }

  const painted = (iso) => (iso in pending ? pending[iso] : Boolean(brush && isAvailable(brush.id, iso)))

  const dateAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-date]')?.getAttribute('data-date') || null

  function strokeStart(e) {
    if (!paint || !brush) return
    const iso = e.target.closest?.('[data-date]')?.getAttribute('data-date')
    if (!iso) return
    e.preventDefault()
    const mode = isAvailable(brush.id, iso) ? 'remove' : 'add'
    stroke.current = { mode }
    setPending({ [iso]: mode === 'add' })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function strokeMove(e) {
    if (!stroke.current) return
    const iso = dateAt(e.clientX, e.clientY)
    if (!iso) return
    const p = pendingRef.current
    if (!(iso in p)) setPending({ ...p, [iso]: stroke.current.mode === 'add' })
  }
  function strokeEnd() {
    if (!stroke.current || !brush) return
    stroke.current = null
    const adds = [], removes = []
    for (const [date, on] of Object.entries(pendingRef.current)) {
      const was = Boolean(isAvailable(brush.id, date))
      if (on && !was) adds.push({ examiner_id: brush.id, date })
      if (!on && was) removes.push({ examiner_id: brush.id, date })
    }
    // onStroke updates the calendar synchronously before it saves, so
    // clearing the stroke overlay right after is seamless.
    if (adds.length || removes.length) onStroke({ adds, removes })
    setPending({})
  }

  function cellKey(e, iso) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (paint && brush) {
      const was = Boolean(isAvailable(brush.id, iso))
      onStroke(was ? { removes: [{ examiner_id: brush.id, date: iso }] } : { adds: [{ examiner_id: brush.id, date: iso }] })
    } else if (!paint) onDayOpen(iso)
  }

  return (
    <>
      <div className="month-nav">
        <button className="navbtn" onClick={() => setCursor(subMonths(cursor, 1))}>← Previous</button>
        <span className="month-label">{format(cursor, 'MMMM yyyy')}</span>
        <button className="navbtn" onClick={() => setCursor(addMonths(cursor, 1))}>Next →</button>
      </div>

      <div
        className={`month-grid${paint ? ' painting' : ''}${focusId ? ' focusing' : ''}`}
        onPointerDown={strokeStart}
        onPointerMove={strokeMove}
        onPointerUp={strokeEnd}
        onPointerCancel={strokeEnd}
      >
        {WEEKDAYS.map((d) => <div key={d} className="dow">{d}</div>)}
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const dayExams = examsByDate[iso] || []
          const avail = availableByDate[iso] || []
          const muted = !isSameMonth(day, cursor)
          const today = isSameDay(day, new Date())

          // Tint: the brush's painted days in paint mode; the spotlighted
          // examiner's available days in focus mode.
          let tintColor = null
          if (paint && brush && painted(iso)) tintColor = brush.color
          else if (!paint && focusId) {
            const hit = avail.find((a) => a.examiner.id === focusId)
            if (hit) tintColor = hit.examiner.color
          }
          const dimmed = !paint && focusId && !tintColor

          const label = `${format(day, 'EEEE, MMMM d')}${avail.length ? `, ${avail.length} available` : ''}${dayExams.length ? `, ${dayExams.length} ${dayExams.length === 1 ? 'exam' : 'exams'}` : ''}`

          return (
            <div key={iso}
              data-date={iso}
              role="button"
              tabIndex={0}
              aria-label={paint && brush ? `${label}. ${painted(iso) ? 'Marked' : 'Not marked'} for ${brush.name}` : label}
              aria-pressed={paint && brush ? painted(iso) : undefined}
              className={`day-cell${muted ? ' muted' : ''}${today ? ' today' : ''}${tintColor ? ' tinted' : ''}${dimmed ? ' dimmed' : ''}`}
              style={tintColor ? { '--tint': tint(tintColor, paint ? 0.2 : 0.14), '--tint-edge': tintColor } : undefined}
              onClick={paint ? undefined : () => onDayOpen(iso)}
              onKeyDown={(e) => cellKey(e, iso)}
            >
              <div className="day-top">
                <span className="day-num">{format(day, 'd')}</span>
                {avail.length > 0 && (
                  <span className="avail-dots" aria-hidden="true">
                    {avail.map(({ examiner, note }) => (
                      <span key={examiner.id}
                        className={`avail-dot${focusId === examiner.id ? ' focus' : ''}${note ? ' noted' : ''}`}
                        style={{ '--c': examiner.color }}
                        title={`${examiner.name} available${note ? ` — ${note}` : ''}`} />
                    ))}
                  </span>
                )}
              </div>
              <div className="day-exams">
                {dayExams.slice(0, MAX_CHIPS).map((ex) => (
                  <div key={ex.id}
                    className={`chip${ex.status === 'completed' ? ' done' : ''}${focusId && ex.examiner_id !== focusId ? ' faded' : ''}`}
                    style={{ '--c': examinerColor(ex.examiner_id) || undefined }}
                    onClick={(e) => { if (paint) return; e.stopPropagation(); onExamClick(ex) }}
                    title={`${ex.client_name} • ${ex.exam_type || 'Type TBD'} • ${examinerName(ex.examiner_id)}`}>
                    <span className="chip-time">{ex.exam_time?.slice(0, 5)}</span>
                    <span className="chip-name">{ex.client_name}</span>
                  </div>
                ))}
                {dayExams.length > MAX_CHIPS && (
                  <button type="button" className="chip-more"
                    onClick={(e) => { if (paint) return; e.stopPropagation(); onDayOpen(iso) }}>
                    +{dayExams.length - MAX_CHIPS} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function AgendaView({ exams, examinerName, examinerColor, canBook, onNew, onExamClick }) {
  if (exams.length === 0) {
    return (
      <div className="cal-empty">
        {canBook ? (
          <>No bookings yet. <button className="link" onClick={onNew}>Create the first one →</button></>
        ) : (
          <>No exams assigned to you yet.</>
        )}
      </div>
    )
  }
  return (
    <div className="agenda">
      {exams.map((ex) => (
        <div key={ex.id} className="agenda-row" onClick={() => onExamClick(ex)}>
          <div className="agenda-when">
            <span className="agenda-date">{format(parseISO(ex.exam_date), 'EEE, MMM d')}</span>
            <span className="agenda-time">{ex.exam_time?.slice(0, 5)}</span>
          </div>
          <div className="agenda-main">
            <span className="agenda-name">{ex.client_name}</span>
            <span className="agenda-meta">
              {ex.organization} · {TEST_TYPE_ABBR[ex.exam_type] || ex.exam_type || 'TBD'} · {ex.duration_minutes}min
            </span>
          </div>
          <div className="agenda-side">
            <span className="agenda-examiner">
              <span className="agenda-dot" style={{ '--c': examinerColor(ex.examiner_id) || 'transparent' }} aria-hidden="true" />
              {examinerName(ex.examiner_id)}
            </span>
            <span className={`status-pill ${ex.status}`}>{ex.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
