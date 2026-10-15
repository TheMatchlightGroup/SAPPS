import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, addDays, parseISO,
} from 'date-fns'
import { useCalendarData } from '../hooks/useCalendarData'
import { useAuth } from '../context/AuthContext'
import { TEST_TYPE_ABBR } from '../lib/constants'
import { isOffice as isOfficeRole, isAdmin } from '../lib/roles'
import { weekStartOf } from '../lib/monthClose'
import { tint } from '../lib/examinerColors'
import BookingModal from '../components/BookingModal'
import CompletionModal from '../components/CompletionModal'
import WeekSummaryPanel from '../components/WeekSummaryPanel'
import ExaminerKey from '../components/ExaminerKey'
import DayDrawer from '../components/DayDrawer'
import PrivateBlockModal from '../components/PrivateBlockModal'
import { timeRange } from '../lib/privateBlocks'
import '../styles/calendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS = 3

export default function CalendarPage() {
  const {
    exams, examiners, examinerName, examinerColor, intakeByExam, reportByExam, weekSubmissions,
    loading, error,
    createBooking, updateBooking, fetchIntake, completeExam, changeExamType, deleteExam, submitWeek,
    waiveReport, unwaiveReport,
    availability, changeAvailability, setAvailabilityNote, setExaminerColor,
    privateBlocks, officeHolds, savePrivateBlock, deletePrivateBlock,
  } = useCalendarData()

  const { user, role } = useAuth()
  // Scheduling + availability are office-only (Tier 3). Examiners and team
  // leads are read-only on the schedule; everyone can open the day drawer.
  const isOffice = isOfficeRole(role)
  const canBook = isOffice
  const showAvailability = isOffice

  const [view, setView] = useState('month') // 'month' | 'agenda'
  const [cursor, setCursor] = useState(new Date())
  const [modal, setModal] = useState(null) // { type:'new', date } | { type:'complete', exam } | { type:'edit', exam } | { type:'private', block?, date? }
  const [drawerDate, setDrawerDate] = useState(null)
  const [paint, setPaint] = useState(false)
  const [brush, setBrush] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [availError, setAvailError] = useState('')

  // ---- Whose schedule (10/8) ----
  // Everyone who can see more than their own exams (office, team lead) can
  // narrow the calendar to one examiner — "Just me" for examiners who also
  // hold a higher role, or any examiner for the office. Everything else
  // falls away: month grid, day drawer, agenda, and the printed list.
  // Remembered per person on this device.
  const seesOthers = useMemo(() => exams.some((e) => e.examiner_id && e.examiner_id !== user?.id), [exams, user])
  const iAmExaminer = examiners.some((e) => e.id === user?.id)
  const showFilter = isOffice || role === 'team_lead' || seesOthers
  const filterKey = user?.id ? `sapps.calShow.${user.id}` : null
  const [onlyId, setOnlyIdState] = useState(() => {
    try { return (filterKey && localStorage.getItem(filterKey)) || '' } catch { return '' }
  })
  const setOnlyId = (v) => {
    setOnlyIdState(v)
    setFocusId(null) // a spotlight on someone filtered out would dim the whole grid
    try { if (filterKey) (v ? localStorage.setItem(filterKey, v) : localStorage.removeItem(filterKey)) } catch { /* private window */ }
  }
  // A remembered examiner who's no longer on the roster: show everyone.
  const only = showFilter && onlyId ? examiners.find((e) => e.id === onlyId) || null : null
  const shownExams = useMemo(() => (only ? exams.filter((e) => e.examiner_id === only.id) : exams), [exams, only])
  const shownBlocks = useMemo(() => (only ? privateBlocks.filter((b) => b.examiner_id === only.id) : privateBlocks), [privateBlocks, only])
  // Examiners log their own private exams; the office can log for anyone.
  const canLogPrivate = iAmExaminer || isOffice

  const blocksByDate = useMemo(() => {
    const map = {}
    for (const b of shownBlocks) (map[b.block_date] ||= []).push(b)
    return map
  }, [shownBlocks])

  const examsByDate = useMemo(() => {
    const map = {}
    for (const ex of shownExams) (map[ex.exam_date] ||= []).push(ex)
    return map
  }, [shownExams])

  // date -> [{ examiner, note }] in roster order (active examiners only).
  const availableByDate = useMemo(() => {
    const order = new Map(examiners.map((e, i) => [e.id, i]))
    const map = {}
    for (const a of Object.values(availability)) {
      if (!order.has(a.examiner_id)) continue
      // Painting shows everyone's dots so the brush examiner is never hidden.
      if (only && !paint && a.examiner_id !== only.id) continue
      ;(map[a.date] ||= []).push({ examiner: examiners[order.get(a.examiner_id)], note: a.note })
    }
    for (const list of Object.values(map)) list.sort((x, y) => order.get(x.examiner.id) - order.get(y.examiner.id))
    return map
  }, [availability, examiners, only, paint])

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
  const openPrivate = (block) => setModal({ type: 'private', block })
  const openNewPrivate = (dateISO) => {
    if (!canLogPrivate) return
    setModal({ type: 'private', block: null, date: dateISO || format(new Date(), 'yyyy-MM-dd') })
  }
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
      if (drawerDate) {
        // Blur first so a note being typed saves (it saves on blur).
        const a = document.activeElement
        if (a && a.closest?.('.day-drawer') && typeof a.blur === 'function') a.blur()
        setDrawerDate(null)
      }
      else if (paint) setPaint(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, drawerDate, paint])

  const drawerBlocks = useMemo(
    () => (drawerDate ? [...(blocksByDate[drawerDate] || [])].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')) : []),
    [drawerDate, blocksByDate]
  )
  const drawerExams = useMemo(
    () => (drawerDate ? [...(examsByDate[drawerDate] || [])].sort((a, b) => (a.exam_time || '').localeCompare(b.exam_time || '')) : []),
    [drawerDate, examsByDate]
  )

  function printSchedule() {
    // Print only the list below (see .sched-print in calendar.css). The
    // browser's print dialog has "Save as PDF".
    const body = document.body
    body.classList.add('printing-schedule')
    // Take the class off when printing ends — 'afterprint' where supported,
    // the print media query as a backup (some mobile browsers), and a
    // timeout as a last resort so a later Ctrl+P never prints the list.
    const mql = window.matchMedia?.('print')
    let timer
    const done = () => {
      body.classList.remove('printing-schedule')
      window.removeEventListener('afterprint', done)
      mql?.removeEventListener?.('change', onMql)
      clearTimeout(timer)
    }
    const onMql = (e) => { if (!e.matches) done() }
    window.addEventListener('afterprint', done)
    mql?.addEventListener?.('change', onMql)
    timer = setTimeout(done, 60000)
    window.print()
  }

  return (
    <div className="cal-page">
      <SchedulePrint
        exams={shownExams} blocks={shownBlocks} cursor={cursor}
        only={only || (!showFilter && iAmExaminer ? examiners.find((e) => e.id === user?.id) || null : null)}
        examinerName={examinerName}
      />
      <WeekSummaryPanel
        exams={exams}
        examiners={examiners}
        intakeByExam={intakeByExam}
        reportByExam={reportByExam}
        weekSubmissions={weekSubmissions}
        submitWeek={submitWeek}
        privateBlocks={privateBlocks}
      />

      <div className="cal-toolbar">
        <div className="cal-title">
          <h2>Polygraph Calendar</h2>
          {only && (
            <div className="cal-only">
              <span className="cal-only-dot" style={{ '--c': only.color || 'var(--ink-500)' }} aria-hidden="true" />
              Showing only <strong>{only.id === user?.id ? 'your exams' : only.name}</strong>
              <button className="link" onClick={() => setOnlyId('')}>Show everyone</button>
            </div>
          )}
        </div>
        <div className="cal-controls">
          {showFilter && examiners.length > 0 && (
            <select className="week-examiner cal-show" value={only ? only.id : ''} onChange={(e) => setOnlyId(e.target.value)}
              aria-label="Whose schedule to show">
              <option value="">Everyone's schedule</option>
              {iAmExaminer && <option value={user.id}>Just me</option>}
              {examiners.filter((e) => e.id !== user?.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
          <button className="btn btn-text cal-print-btn" onClick={printSchedule}
            title={`Print or save as PDF a day-by-day list of ${format(cursor, 'MMMM yyyy')}${only ? ` for ${only.name}` : ' for everyone'}`}>
            🖨 Print {format(cursor, 'MMMM')}{only ? ` · ${only.id === user?.id ? 'mine' : only.name.split(' ')[0]}` : ''}
          </button>
          <div className="view-toggle">
            <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'agenda' ? 'on' : ''} onClick={() => { setView('agenda'); setPaint(false) }}>Agenda</button>
          </div>
          {canLogPrivate && (
            <button className="btn cal-private-btn" onClick={() => openNewPrivate()}
              title="Hold time for an exam you're running for your own company">
              + Private Exam
            </button>
          )}
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
            examsByDate={examsByDate} blocksByDate={blocksByDate} examinerName={examinerName} examinerColor={examinerColor}
            availableByDate={showAvailability ? availableByDate : {}}
            focusId={focusId}
            paint={paint} brush={examiners.find((e) => e.id === brush) || null}
            isAvailable={isAvailable} onStroke={change}
            onDayOpen={openDay} onExamClick={openComplete} onBlockClick={openPrivate}
          />
        </>
      ) : (
        <AgendaView
          exams={shownExams} blocks={shownBlocks} examinerName={examinerName} examinerColor={examinerColor}
          canBook={canBook} filtered={Boolean(only)}
          onNew={() => openNew()} onExamClick={openComplete} onBlockClick={openPrivate}
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
          blocks={drawerBlocks}
          onBlockClick={openPrivate}
          canLogPrivate={canLogPrivate}
          onNewPrivate={(iso) => openNewPrivate(iso)}
        />
      )}

      {modal?.type === 'new' && canBook && (
        <BookingModal
          examiners={examiners}
          defaultDate={modal.date}
          exams={exams} privateBlocks={privateBlocks} examinerName={examinerName}
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
          exams={exams} privateBlocks={privateBlocks} examinerName={examinerName}
          isAvailable={showAvailability ? isAvailable : null}
          hasAvailabilityFor={(iso) => Object.keys(availableByDate).some((k) => k.slice(0, 7) === iso.slice(0, 7))}
          onClose={closeModal}
          onSave={(form) => updateBooking(modal.exam.id, form)}
        />
      )}
      {modal?.type === 'private' && (
        <PrivateBlockModal
          block={modal.block}
          defaultDate={modal.date}
          examiners={examiners}
          userId={user?.id}
          isOffice={isOffice}
          exams={exams}
          privateBlocks={[...privateBlocks, ...officeHolds]}
          examinerName={examinerName}
          onSave={savePrivateBlock}
          onDelete={deletePrivateBlock}
          onClose={closeModal}
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
          weekSubmitted={weekSubmissions.some((w) => w.examiner_id === modal.exam.examiner_id && w.week_start === weekStartOf(modal.exam.exam_date))}
          onChangeType={changeExamType}
        />
      )}
    </div>
  )
}

function MonthView({
  cursor, setCursor, examsByDate, blocksByDate = {}, examinerName, examinerColor,
  availableByDate, focusId, paint, brush, isAvailable, onStroke,
  onDayOpen, onExamClick, onBlockClick,
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
          const dayBlocks = blocksByDate[iso] || []
          // SAPPS exams and private exams share the day's chip list, by time.
          const items = [
            ...dayExams.map((ex) => ({ kind: 'exam', t: ex.exam_time || '', ex })),
            ...dayBlocks.map((b) => ({ kind: 'private', t: b.start_time || '', b })),
          ].sort((a, b) => a.t.localeCompare(b.t))
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

          const label = `${format(day, 'EEEE, MMMM d')}${avail.length ? `, ${avail.length} available` : ''}${dayExams.length ? `, ${dayExams.length} ${dayExams.length === 1 ? 'exam' : 'exams'}` : ''}${dayBlocks.length ? `, ${dayBlocks.length} private` : ''}`

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
                {items.slice(0, MAX_CHIPS).map((it) => it.kind === 'private' ? (
                  <div key={it.b.id}
                    className={`chip private${focusId && it.b.examiner_id !== focusId ? ' faded' : ''}`}
                    style={{ '--c': examinerColor(it.b.examiner_id) || undefined, '--pc-tint': examinerColor(it.b.examiner_id) ? tint(examinerColor(it.b.examiner_id), 0.18) : undefined }}
                    onClick={(e) => { if (paint) return; e.stopPropagation(); onBlockClick(it.b) }}
                    title={`Private exam ${timeRange(it.b.start_time, it.b.duration_minutes)} • ${examinerName(it.b.examiner_id)}${it.b.at_office ? ' • at the SAPPS office' : ''}`}>
                    <span className="chip-time">{it.b.start_time?.slice(0, 5)}</span>
                    <span className="chip-name">Private · {examinerName(it.b.examiner_id).split(' ')[0]}</span>
                  </div>
                ) : ((ex) => (
                  <div key={ex.id}
                    className={`chip${ex.status === 'completed' ? ' done' : ''}${focusId && ex.examiner_id !== focusId ? ' faded' : ''}`}
                    style={{ '--c': examinerColor(ex.examiner_id) || undefined }}
                    onClick={(e) => { if (paint) return; e.stopPropagation(); onExamClick(ex) }}
                    title={`${ex.client_name} • ${ex.exam_type || 'Type TBD'} • ${examinerName(ex.examiner_id)}`}>
                    <span className="chip-time">{ex.exam_time?.slice(0, 5)}</span>
                    <span className="chip-name">{ex.client_name}</span>
                  </div>
                ))(it.ex))}
                {items.length > MAX_CHIPS && (
                  <button type="button" className="chip-more"
                    onClick={(e) => { if (paint) return; e.stopPropagation(); onDayOpen(iso) }}>
                    +{items.length - MAX_CHIPS} more
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

function AgendaView({ exams, blocks = [], examinerName, examinerColor, canBook, filtered = false, onNew, onExamClick, onBlockClick }) {
  const rows = useMemo(() => [
    ...exams.map((ex) => ({ kind: 'exam', k: `${ex.exam_date} ${ex.exam_time || ''}`, ex })),
    ...blocks.map((b) => ({ kind: 'private', k: `${b.block_date} ${b.start_time || ''}`, b })),
  ].sort((a, b) => a.k.localeCompare(b.k)), [exams, blocks])
  if (rows.length === 0) {
    return (
      <div className="cal-empty">
        {filtered ? (
          <>No exams for this examiner.</>
        ) : canBook ? (
          <>No bookings yet. <button className="link" onClick={onNew}>Create the first one →</button></>
        ) : (
          <>No exams assigned to you yet.</>
        )}
      </div>
    )
  }
  return (
    <div className="agenda">
      {rows.map((r) => r.kind === 'private' ? (
        <div key={r.b.id} className="agenda-row private" onClick={() => onBlockClick(r.b)}>
          <div className="agenda-when">
            <span className="agenda-date">{format(parseISO(r.b.block_date), 'EEE, MMM d')}</span>
            <span className="agenda-time">{r.b.start_time?.slice(0, 5)}</span>
          </div>
          <div className="agenda-main">
            <span className="agenda-name">Private exam</span>
            <span className="agenda-meta">
              {timeRange(r.b.start_time, r.b.duration_minutes)} · {r.b.at_office ? 'At the SAPPS office' : 'Not at the office'}
            </span>
          </div>
          <div className="agenda-side">
            <span className="agenda-examiner">
              <span className="agenda-dot" style={{ '--c': examinerColor(r.b.examiner_id) || 'transparent' }} aria-hidden="true" />
              {examinerName(r.b.examiner_id)}
            </span>
            <span className="status-pill private">private</span>
          </div>
        </div>
      ) : ((ex) => (
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
      ))(r.ex))}
    </div>
  )
}

// Print-only: a day-by-day list of one month — everyone, or the one
// examiner the calendar is narrowed to. Hidden on screen; "Print <Month>"
// shows only this (see .sched-print in calendar.css).
function SchedulePrint({ exams, blocks = [], cursor, only, examinerName }) {
  const ym = format(cursor, 'yyyy-MM')
  const days = useMemo(() => {
    const map = {}
    for (const ex of exams) if (ex.exam_date?.slice(0, 7) === ym) (map[ex.exam_date] ||= []).push(ex)
    // Private exams print as "Private exam" rows so the office sees the hold.
    for (const b of blocks) {
      if (b.block_date?.slice(0, 7) !== ym) continue
      ;(map[b.block_date] ||= []).push({
        id: `pb-${b.id}`, private: true, exam_time: b.start_time, duration_minutes: b.duration_minutes,
        client_name: 'Private exam', organization: b.at_office ? 'At the SAPPS office' : '—',
        exam_type: timeRange(b.start_time, b.duration_minutes), examiner_id: b.examiner_id,
      })
    }
    return Object.keys(map).sort().map((d) => ({
      date: d,
      rows: map[d].sort((a, b) => (a.exam_time || '').localeCompare(b.exam_time || '')),
    }))
  }, [exams, blocks, ym])
  const total = days.reduce((n, d) => n + d.rows.filter((r) => !r.private).length, 0)
  const who = only ? only.name : 'All examiners'
  return (
    <section className="sched-print" aria-hidden="true">
      <header className="sp-head">
        <div>
          <div className="sp-company">Smith &amp; Associates · Polygraph Schedule</div>
          <h1 className="sp-title">{who}</h1>
          <div className="sp-month">{format(cursor, 'MMMM yyyy')} · {total} {total === 1 ? 'exam' : 'exams'}</div>
        </div>
        <img className="sp-logo" src="/SAPPS_logo.svg" alt="" />
      </header>
      {days.length === 0 ? (
        <p className="sp-empty">No exams scheduled this month.</p>
      ) : days.map(({ date, rows }) => (
        <div key={date} className="sp-day">
          <h2 className="sp-date">{format(parseISO(date), 'EEEE, MMMM d')}</h2>
          <table className={`sp-table${only ? ' one' : ''}`}>
            <colgroup>
              <col className="c-time" /><col className="c-name" /><col className="c-org" /><col className="c-type" />
              <col className="c-len" />{!only && <col className="c-ex" />}<col className="c-status" />
            </colgroup>
            <tbody>
              {rows.map((ex) => (
                <tr key={ex.id}>
                  <td className="sp-time">{ex.exam_time?.slice(0, 5) || '—'}</td>
                  <td className="sp-name">{ex.private ? <em>{ex.client_name}</em> : ex.client_name}</td>
                  <td>{ex.organization}</td>
                  <td>{ex.exam_type || 'Type TBD'}</td>
                  <td className="sp-len">{ex.duration_minutes ? `${ex.duration_minutes} min` : ''}</td>
                  {!only && <td className="sp-ex">{examinerName(ex.examiner_id)}</td>}
                  <td className="sp-status">{ex.status === 'completed' ? '✓ Done' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <footer className="sp-foot">Printed {format(new Date(), 'MMM d, yyyy · h:mm a')} · Schedules change — check the app for the latest.</footer>
    </section>
  )
}
