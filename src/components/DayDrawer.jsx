import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { TEST_TYPE_ABBR } from '../lib/constants'
import '../styles/day-drawer.css'

/**
 * Day at a glance — slides in from the right on desktop (Gmail's side
 * panel), full screen on a phone. Opened by tapping any day, its date,
 * or "+N more".
 *
 *   Available  (office only) — tap names to mark who's free, add a note
 *   Exams      every booking that day; tap one to open it
 *   Footer     + New booking (office only)
 */
export default function DayDrawer({
  date, onClose, onShiftDay,
  exams, examiners, examinerName, examinerColor,
  showAvailability, availableFor, onToggleAvailable, onNote,
  canBook, onNewBooking, onExamClick,
}) {
  const d = parseISO(date)
  const panelRef = useRef(null)

  // Keep the page behind from scrolling while the drawer is open (mobile),
  // and move focus into the drawer for keyboard users.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  const available = showAvailability ? examiners.filter((ex) => availableFor(ex.id)) : []

  return (
    <>
      <div className="dd-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="day-drawer" role="dialog" aria-modal="true" aria-labelledby="dd-title" tabIndex={-1} ref={panelRef}>
        <header className="dd-head">
          <div className="dd-when">
            <span className="dd-dow">{format(d, 'EEEE')}</span>
            <h3 id="dd-title" className="dd-date">{format(d, 'MMMM d, yyyy')}</h3>
          </div>
          <div className="dd-nav">
            <button type="button" className="dd-iconbtn" onClick={() => onShiftDay(-1)} aria-label="Previous day">‹</button>
            <button type="button" className="dd-iconbtn" onClick={() => onShiftDay(1)} aria-label="Next day">›</button>
            <button type="button" className="dd-iconbtn close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="dd-body">
          {showAvailability && (
            <section className="dd-sec">
              <div className="dd-sec-head">
                <h4>Available</h4>
                <span className="dd-count">{available.length} of {examiners.length}</span>
              </div>
              <div className="dd-avail" role="group" aria-label="Mark who is available">
                {examiners.map((ex) => {
                  const on = Boolean(availableFor(ex.id))
                  return (
                    <button key={ex.id} type="button" className={`dd-av${on ? ' on' : ''}`}
                      style={{ '--c': ex.color }} aria-pressed={on}
                      onClick={() => onToggleAvailable(ex.id, !on)}>
                      <span className="dd-dot" aria-hidden="true" />
                      {ex.name}
                    </button>
                  )
                })}
              </div>
              {available.length > 0 && (
                <div className="dd-notes">
                  {available.map((ex) => {
                    const note = availableFor(ex.id)?.note || ''
                    return (
                      <label key={`${ex.id}-${date}-${note}`} className="dd-note">
                        <span className="dd-dot" style={{ '--c': ex.color }} aria-hidden="true" />
                        <span className="dd-note-name">{ex.name.split(' ')[0]}</span>
                        <input type="text" defaultValue={note} placeholder="Add a note — e.g. AM only"
                          maxLength={80}
                          onBlur={(e) => { if (e.target.value.trim() !== note) onNote(ex.id, e.target.value) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                      </label>
                    )
                  })}
                </div>
              )}
              {examiners.length === 0 && <p className="dd-empty">No active examiners.</p>}
            </section>
          )}

          <section className="dd-sec">
            <div className="dd-sec-head">
              <h4>Exams</h4>
              <span className="dd-count">{exams.length}</span>
            </div>
            {exams.length === 0 ? (
              <p className="dd-empty">No exams booked{canBook ? ' yet.' : '.'}</p>
            ) : (
              <div className="dd-exams">
                {exams.map((ex) => (
                  <button key={ex.id} type="button" className={`dd-exam${ex.status === 'completed' ? ' done' : ''}`}
                    style={{ '--c': examinerColor(ex.examiner_id) || 'var(--gold)' }}
                    onClick={() => onExamClick(ex)}>
                    <span className="dd-exam-time">{ex.exam_time?.slice(0, 5)}</span>
                    <span className="dd-exam-main">
                      <span className="dd-exam-name">{ex.client_name}</span>
                      <span className="dd-exam-meta">
                        {ex.organization}{ex.exam_type ? ` · ${TEST_TYPE_ABBR[ex.exam_type] || ex.exam_type}` : ''} · {ex.duration_minutes}min
                      </span>
                      <span className="dd-exam-who">
                        <span className="dd-dot" aria-hidden="true" />
                        {examinerName(ex.examiner_id)}
                      </span>
                    </span>
                    <span className={`status-pill ${ex.status}`}>{ex.status}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {canBook && (
          <footer className="dd-foot">
            <button type="button" className="btn btn-primary dd-new" onClick={() => onNewBooking(date)}>
              + New booking on {format(d, 'MMM d')}
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
