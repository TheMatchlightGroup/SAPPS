import { useState } from 'react'
import { ORGANIZATIONS } from '../lib/constants'
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
export default function BookingModal({ examiners, defaultDate, exam, onClose, onSave }) {
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

  async function handleSubmit() {
    setError('')
    if (!form.client_name.trim()) return setError('Examinee name is required.')
    if (!form.organization) return setError('Select a district or organization.')
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
                {examiners.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
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
