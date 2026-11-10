import { useState, useMemo, useRef, useEffect, useId } from 'react'
import { format, parseISO } from 'date-fns'
import { TEST_TYPE_ABBR } from '../lib/constants'

// ---- Find an examinee (11/10, per Cris) ----
// Searches every exam the calendar has loaded (all months — the office sees
// everyone's, examiners only their own), not just the month on screen.
// Every word typed must appear somewhere in the name, in any order and
// ignoring punctuation, so "boyd t", "T. Boyd" and "tboyd"-style partials
// like "boy" all find "T. Boyd". Upcoming exams list first (soonest at the
// top), then past ones (most recent first). Picking one jumps the calendar
// to that day and opens the exam.

const MAX_RESULTS = 40
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

/** Every query word appears in the name (in any order). */
export function nameMatches(name, query) {
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return false
  const hay = norm(name)
  const squashed = hay.replace(/ /g, '')
  return words.every((w) => hay.includes(w) || squashed.includes(w))
}

export default function ExamSearch({ exams, examinerName, examinerColor, onPick, today = format(new Date(), 'yyyy-MM-dd') }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listId = useId()

  const query = q.trim()
  const ready = norm(query).replace(/ /g, '').length >= 2

  const { results, total } = useMemo(() => {
    if (!ready) return { results: [], total: 0 }
    const hits = exams.filter((e) => nameMatches(e.client_name, query))
    const key = (e) => `${e.exam_date || ''} ${e.exam_time || ''}`
    const upcoming = hits.filter((e) => (e.exam_date || '') >= today).sort((a, b) => key(a).localeCompare(key(b)))
    const past = hits.filter((e) => (e.exam_date || '') < today).sort((a, b) => key(b).localeCompare(key(a)))
    const all = [...upcoming, ...past]
    return { results: all.slice(0, MAX_RESULTS), total: all.length }
  }, [exams, query, ready, today])

  useEffect(() => { setActive(0) }, [query])

  // Click anywhere else closes the list (the typed text stays).
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return
    wrapRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  function pick(ex) {
    setOpen(false)
    inputRef.current?.blur()
    onPick(ex)
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      // Handle it here so the calendar's own Esc (close drawer / paint) doesn't fire too.
      e.stopPropagation()
      // preventDefault: Chrome/Safari search boxes wipe the text on Esc by
      // default — first Esc should only close the list.
      if (open && query) { e.preventDefault(); setOpen(false) }
      else { setQ(''); inputRef.current?.blur() }
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && open) { e.preventDefault(); pick(results[active] || results[0]) }
  }

  const showList = open && ready
  let pastHeaderShown = false

  return (
    <div className="exam-search" ref={wrapRef}>
      <span className="exam-search-icon" aria-hidden="true">⌕</span>
      <input
        ref={inputRef}
        type="search"
        className="exam-search-input"
        placeholder="Find an examinee…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        aria-label="Find an examinee by name"
        autoComplete="off"
        spellCheck={false}
      />
      {showList && (
        <div className="exam-search-panel" id={listId} role="listbox" aria-label="Matching exams">
          {results.length === 0 ? (
            <div className="es-empty">No exams for “{query}”.</div>
          ) : (
            <>
              {results.map((ex, i) => {
                const past = (ex.exam_date || '') < today
                const header = past && !pastHeaderShown && i > 0
                if (past) pastHeaderShown = true
                return (
                  <div key={ex.id}>
                    {header && <div className="es-divider">Earlier</div>}
                    <div
                      id={`${listId}-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === active}
                      className={`es-row${i === active ? ' active' : ''}${past ? ' past' : ''}`}
                      onPointerEnter={() => setActive(i)}
                      onPointerDown={(e) => e.preventDefault() /* keep focus until click lands */}
                      onClick={() => pick(ex)}
                    >
                      <div className="es-when">
                        <span className="es-date">{ex.exam_date ? format(parseISO(ex.exam_date), 'EEE, MMM d, yyyy') : '—'}</span>
                        <span className="es-time">{ex.exam_time?.slice(0, 5) || ''}</span>
                      </div>
                      <div className="es-main">
                        <span className="es-name">{ex.client_name}</span>
                        <span className="es-meta">
                          {ex.organization || '—'} · {TEST_TYPE_ABBR[ex.exam_type] || ex.exam_type || 'Type TBD'}
                        </span>
                      </div>
                      <div className="es-side">
                        <span className="es-examiner">
                          <span className="agenda-dot" style={{ '--c': examinerColor(ex.examiner_id) || 'transparent' }} aria-hidden="true" />
                          {examinerName(ex.examiner_id)}
                        </span>
                        <span className={`status-pill ${ex.status}`}>{ex.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {total > results.length && (
                <div className="es-more">Showing {results.length} of {total} — type more of the name to narrow it.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
