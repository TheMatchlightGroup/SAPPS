import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import '../styles/modal.css'

// Change-password dialog. Available to everyone from the nav; also opened by
// the temp-password banner. Supabase enforces its own minimum (6); we ask for
// 8 so the passwords people set here are at least a little better than the
// temporary one they came in with.
export default function ChangePasswordModal({ onClose, required = false }) {
  const { updatePassword } = useAuth()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e?.preventDefault()
    setError('')
    if (pw1.length < 8) return setError('Use at least 8 characters.')
    if (pw1 !== pw2) return setError("Those two don't match.")
    if (pw1 === 'Sapps2026!') return setError('Pick something other than the temporary password.')
    setBusy(true)
    const { error } = await updatePassword(pw1)
    setBusy(false)
    if (error) return setError(error)
    setDone(true)
  }

  return (
    <div className="modal-overlay" onClick={done || !required ? onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cpw-title">
        <header className="modal-head">
          <h3 id="cpw-title">{done ? 'Password updated' : 'Change password'}</h3>
        </header>

        {done ? (
          <>
            <div className="modal-body">
              <p className="mnote">You're set — use your new password next time you sign in.</p>
            </div>
            <footer className="modal-foot">
              <span />
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </footer>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="modal-body">
              {required && (
                <p className="mnote" style={{ marginBottom: 'var(--s-4)' }}>
                  You signed in with a temporary password. Choose your own to keep going.
                </p>
              )}
              <div className="field">
                <label htmlFor="cpw-1">New password</label>
                <input id="cpw-1" type={show ? 'text' : 'password'} autoComplete="new-password"
                  value={pw1} onChange={(e) => setPw1(e.target.value)} autoFocus />
                <span className="field-hint">At least 8 characters.</span>
              </div>
              <div className="field">
                <label htmlFor="cpw-2">Confirm new password</label>
                <input id="cpw-2" type={show ? 'text' : 'password'} autoComplete="new-password"
                  value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <label className="report-waive" style={{ marginTop: 'var(--s-2)' }}>
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
                <span>Show password</span>
              </label>
              {error && <div className="modal-error">{error}</div>}
            </div>
            <footer className="modal-foot">
              {required ? <span /> : <button type="button" className="btn btn-text" onClick={onClose} disabled={busy}>Cancel</button>}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
