import { useState } from 'react'
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { PALETTE } from '../lib/examinerColors'

// Weekday toggles, Monday-first (date-fns getDay: Sun = 0).
const WEEKDAYS = [
  { d: 1, label: 'M', name: 'Mon' }, { d: 2, label: 'T', name: 'Tue' }, { d: 3, label: 'W', name: 'Wed' },
  { d: 4, label: 'T', name: 'Thu' }, { d: 5, label: 'F', name: 'Fri' }, { d: 6, label: 'S', name: 'Sat' },
  { d: 0, label: 'S', name: 'Sun' },
]

const firstName = (n) => (n || '').replace(/^Myron\s+"?Al"?\s+/i, 'Al ').split(' ')[0]

/**
 * The color key above the month (office only).
 *
 * Normal mode: tap an examiner to spotlight their available days (tap
 * again to clear). Paint mode: tap an examiner to pick them as the
 * "brush", then tap or drag across the calendar. The tools row adds a
 * weekly pattern fill, a clear-the-month, and (Tier 3) a color picker.
 */
export default function ExaminerKey({
  examiners, cursor, availability,
  paint, onTogglePaint, brush, onBrush, focusId, onFocus,
  onChange, onColor, canColor,
}) {
  const [days, setDays] = useState([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [msg, setMsg] = useState('')

  const brushEx = examiners.find((e) => e.id === brush) || null
  const monthName = format(cursor, 'MMMM')
  const monthDates = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2600) }

  async function fillWeekly() {
    if (!brushEx || days.length === 0) return
    const adds = monthDates
      .filter((d) => days.includes(d.getDay()))
      .map((d) => format(d, 'yyyy-MM-dd'))
      .filter((iso) => !availability[`${brushEx.id}__${iso}`])
      .map((date) => ({ examiner_id: brushEx.id, date }))
    const { error } = await onChange({ adds })
    flash(error ? `Couldn't save: ${error}` : adds.length ? `Added ${adds.length} ${adds.length === 1 ? 'day' : 'days'} for ${firstName(brushEx.name)}.` : 'Those days were already marked.')
  }

  async function clearMonth() {
    if (!brushEx) return
    const removes = monthDates
      .map((d) => format(d, 'yyyy-MM-dd'))
      .filter((iso) => availability[`${brushEx.id}__${iso}`])
      .map((date) => ({ examiner_id: brushEx.id, date }))
    setConfirmClear(false)
    const { error } = await onChange({ removes })
    flash(error ? `Couldn't save: ${error}` : `Cleared ${firstName(brushEx.name)}'s ${monthName}.`)
  }

  const usedBy = (hex) => examiners.find((e) => e.id !== brush && e.color?.toUpperCase() === hex.toUpperCase())

  return (
    <div className={`exkey${paint ? ' painting' : ''}`}>
      <div className="exkey-row">
        <span className="exkey-label">{paint ? 'Painting' : 'Available'}</span>
        <div className="exkey-chips" role="group" aria-label={paint ? 'Choose who to paint' : 'Spotlight an examiner'}>
          {examiners.map((ex) => {
            const on = paint ? brush === ex.id : focusId === ex.id
            return (
              <button
                key={ex.id}
                type="button"
                className={`exkey-chip${on ? ' on' : ''}${!paint && focusId && !on ? ' faded' : ''}`}
                style={{ '--c': ex.color }}
                aria-pressed={on}
                onClick={() => (paint ? onBrush(ex.id) : onFocus(on ? null : ex.id))}
                title={paint ? `Paint ${ex.name}'s availability` : on ? 'Show everyone' : `Spotlight ${ex.name}'s available days`}
              >
                <span className="exkey-dot" aria-hidden="true" />
                {ex.name}
              </button>
            )
          })}
        </div>
        <button type="button" className={`exkey-paint${paint ? ' on' : ''}`} onClick={onTogglePaint}>
          {paint ? '✓ Done' : '✎ Paint availability'}
        </button>
      </div>

      {paint && (
        <div className="exkey-tools">
          {brushEx ? (
            <>
              <p className="exkey-help">
                <span className="exkey-dot" style={{ '--c': brushEx.color }} aria-hidden="true" />
                Tap or drag across days to mark <strong>{firstName(brushEx.name)}</strong> available.
                Tap a marked day to clear it.
              </p>

              <div className="exkey-toolrow">
                <div className="exkey-weekly">
                  <span className="exkey-sub">Every</span>
                  {WEEKDAYS.map((w) => {
                    const on = days.includes(w.d)
                    return (
                      <button key={w.d} type="button" className={`wk${on ? ' on' : ''}`} aria-pressed={on}
                        aria-label={w.name} title={w.name}
                        style={on ? { '--c': brushEx.color } : undefined}
                        onClick={() => setDays((ds) => (on ? ds.filter((x) => x !== w.d) : [...ds, w.d]))}>
                        {w.label}
                      </button>
                    )
                  })}
                  <button type="button" className="exkey-action" disabled={days.length === 0} onClick={fillWeekly}>
                    Fill {monthName}
                  </button>
                </div>

                {confirmClear ? (
                  <span className="exkey-confirm">
                    Clear all of {firstName(brushEx.name)}'s {monthName}?
                    <button type="button" className="exkey-action danger" onClick={clearMonth}>Clear</button>
                    <button type="button" className="exkey-action ghost" onClick={() => setConfirmClear(false)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" className="exkey-action ghost" onClick={() => setConfirmClear(true)}>
                    Clear {firstName(brushEx.name)}'s {monthName}
                  </button>
                )}
              </div>

              {canColor && (
                <div className="exkey-colors">
                  <span className="exkey-sub">{firstName(brushEx.name)}'s color</span>
                  {PALETTE.map((p) => {
                    const taken = usedBy(p.hex)
                    const current = brushEx.color?.toUpperCase() === p.hex.toUpperCase()
                    return (
                      <button key={p.hex} type="button"
                        className={`swatch${current ? ' on' : ''}`}
                        style={{ '--c': p.hex }}
                        disabled={Boolean(taken)}
                        aria-label={`${p.name}${taken ? ` — used by ${taken.name}` : ''}`}
                        title={taken ? `${p.name} — used by ${taken.name}` : p.name}
                        onClick={() => !current && onColor(brushEx.id, p.hex)} />
                    )
                  })}
                </div>
              )}
              {msg && <p className="exkey-msg" role="status">{msg}</p>}
            </>
          ) : (
            <p className="exkey-help">Pick an examiner above to start painting.</p>
          )}
        </div>
      )}
    </div>
  )
}
