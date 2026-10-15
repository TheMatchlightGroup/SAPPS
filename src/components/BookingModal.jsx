import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ORGANIZATIONS, orgExaminers } from '../lib/constants'
import { scheduleConflicts } from '../lib/privateBlocks'
import '../styles/modal.css'

const todayISO = () => {
  const d = new Date() // local date, not UTC — Virginia evenings are still today
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Office-only scheduling modal. Test type is NOT chosen here — for probation
// work the exam type isn't known until the examinee is in the chair, so it
// moved to the CompletionModal (decided on the 8/8 review call).
//
// Pass `exam` to edit an existing booking (reshuffles, name fixes, swaps);
// omit it to create a new one. `onSave(form)` handles both — the caller
// decides whether that's an insert or an update.
//
// Availability (office): `isAvailable(examinerId, date)` puts that day's
// available examiners at the top of the dropdown, and picking someone who
// isn't marked available shows a soft warning — never a block. The warning
// only appears once availability has been entered for that month
// (`hasAvailabilityFor`), so an unpainted month doesn't nag on every booking.
//
// Conflicts (10/15): booking over the examiner's private exam, their other
// SAPPS exam, or a private exam being held at the office shows a soft
// warning — never a block.
//
// Restricted agencies (ORG_DIRECTORY.examiners, e.g. US Probation Office):
// the examiner dropdown offers only the listed examiners.
export default function BookingModal({
  examiners, defaultDate, exam, onClose, onSave, isAvailable = null, hasAvailabilityFor = () => false,
  exams = [], privateBlocks = [], examinerName = () => '',
}) {
  const editing = Boolean(exam)

  const [form, setForm] = useState(() =>
    editing
      ? {
          client_name: exam.client_name || '',
          exam_date: exam.exam_date,
          exam_time: exam.exam_time?.slice(0, 5) || '10:00',
          organization: exam.organization || '',
          examiner_id: exam.examiner_id || '',
          duration_minutes: exam.duration_minutes || 60,
        }
      : {
          client_name: '',
          exam_date: defaultDate || todayISO(),
          exam_time: '10:00',
          organization: '',
          examiner_id: '',
          duration_minutes: 60,
        }
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Agency restriction: only the listed examiners (plus whoever is already
  // assigned on an edit, so the dropdown never silently changes it).
  const allowed = orgExaminers(form.organization)
  const allowedSet = allowed ? new Set(allowed.map((x) => x.toLowerCase())) : null
  const isAllowed = (e) => !allowedSet || allowedSet.has(String(e.email || '').toLowerCase())
  const pool = allowedSet ? examiners.filter((e) => isAllowed(e) || e.id === form.examiner_id) : examiners

  const tracking = Boolean(isAvailable) && Boolean(form.exam_date) && hasAvailabilityFor(form.exam_date)
  const availableHere = tracking ? pool.filter((e) => isAvailable(e.id, form.exam_date)) : []
  const others = tracking ? pool.filter((e) => !isAvailable(e.id, form.exam_date)) : pool
  const dayLabel = form.exam_date ? format(parseISO(form.exam_date), 'EEE, MMM d') : ''
  const picked = examiners.find((e) => e.id === form.examiner_id)
  const pickedNote = picked && tracking ? isAvailable(picked.id, form.exam_date)?.note : null
  const offDay = Boolean(picked) && tracking && !isAvailable(picked.id, form.exam_date)
  const notForOrg = Boolean(picked) && allowedSet && !isAllowed(picked)
  const allowedNames = allowedSet ? examiners.filter(isAllowed).map((e) => e.name.split(' ')[0]) : []

  const conflicts = useMemo(() => scheduleConflicts(
    { date: form.exam_date, time: form.exam_time, minutes: form.duration_minutes, examinerId: form.examiner_id || null, examId: exam?.id },
    { exams, privateBlocks, examinerName },
  ), [form.exam_date, form.exam_time, form.duration_minutes, form.examiner_id, exam, exams, privateBlocks, examinerName])

  async function handleSubmit() {
    setError('')
    if (!form.client_name.trim()) return setError('Examinee name is required.')
    if (!form.organization) return setError('Select a district or organization.')
    if (notForOrg) return setError(`${picked.name} doesn't take ${form.organization} exams.`)
    setBusy(true)
    const { error } = await onSave(form)
    setBusy(false)
    if (error) setError(error)
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{editing ? 'Edit Booking' : 'New Booking'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="field">
            <label>Examinee name</label>
            <input type="text" value={form.client_name}
              onChange={set('client_name')} placeholder="Enter examinee name" autoFocus />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.exam_date} onChange={set('exam_date')} />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={form.exam_time} onChange={set('exam_time')} />
            </div>
          </div>

          <div className="field">
            <label>District / Organization</label>
            <select value={form.organization} onChange={set('organization')}>
              <option value="" disabled>Select…</option>
              {Object.entries(ORGANIZATIONS).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((name) => <option key={name} value={name}>{name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Assigned examiner</label>
              <select value={form.examiner_id} onChange={set('examiner_id')}>
                <option value="">Unassigned</option>
                {tracking ? (
                  <>
                    <optgroup label={availableHere.length ? `Available ${dayLabel}` : `Nobody marked available ${dayLabel}`}>
                      {availableHere.map((e) => (
                        <option key={e.id} value={e.id}>
                          {'● '}{e.name}{isAvailable(e.id, form.exam_date)?.note ? ` — ${isAvailable(e.id, form.exam_date).note}` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Not marked available">
                      {others.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </optgroup>
                  </>
                ) : (
                  pool.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)
                )}
              </select>
              {allowedSet && allowedNames.length > 0 && (
                <span className="field-hint">
                  Only {allowedNames.length > 1 ? `${allowedNames.slice(0, -1).join(', ')} and ${allowedNames[allowedNames.length - 1]}` : allowedNames[0]} take {form.organization} exams.
                </span>
              )}
              {notForOrg && (
                <span className="field-warn" role="status">
                  {picked.name.split(' ')[0]} doesn't take {form.organization} exams. Pick one of the examiners above.
                </span>
              )}
              {offDay && (
                <span className="field-warn" role="status">
                  {picked.name.split(' ')[0]} isn't marked available on {dayLabel}. You can still book.
                </span>
              )}
              {pickedNote && <span className="field-hint">Note for this day: {pickedNote}</span>}
              {examiners.length === 0 && (
                <span className="field-hint">
                  No examiners yet — create examiner accounts and they'll appear here.
                </span>
              )}
            </div>
            <div className="field">
              <label>Duration (min)</label>
              <input type="number" min="15" step="15"
                value={form.duration_minutes} onChange={set('duration_minutes')} />
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="field-warn" role="status">
              {conflicts.map((c, i) => <div key={i}>{c.text}</div>)}
              <div style={{ marginTop: 4, opacity: 0.75 }}>You can still book — just double-check first.</div>
            </div>
          )}

          <p className="field-hint" style={{ marginTop: 'var(--s-2, 8px)' }}>
            Test type and amounts are entered by the examiner when the exam is completed.
          </p>
        </div>

        <footer className="modal-foot">
          <button className="btn btn-text" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Booking'}
          </button>
        </footer>
      </div>
    </div>
  )
}
