import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

// Sign-in only. Account creation is admin-managed (decided on the 8/8 review
// call): new examiners are provisioned on the database side with a temporary
// password, then reset it themselves. The signUp path still exists in
// AuthContext for the day self-serve onboarding makes sense — it just has no
// front door here.
export default function LoginPage() {
  const { signIn, requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // Synchronous guard: on phones the keyboard's Go key and the button could
  // both fire before `busy` re-rendered, sending duplicate sign-in requests.
  const inFlight = useRef(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    if (inFlight.current) return
    setError('')
    setNotice('')
    if (!email.trim() || (mode === 'signin' && !password)) {
      setError(mode === 'signin' ? 'Email and password are required.' : 'Enter your email address.')
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      if (mode === 'reset') {
        const { error } = await requestPasswordReset(email)
        if (error) throw error
        setNotice('If that email has a SAPPS account, a reset link is on its way. Check your inbox (and spam).')
        return
      }
      const { error } = await signIn(email, password)
      if (error) throw error
      // Admins land on the Today hub; examiners are redirected to the
      // calendar by the /today route guard.
      navigate('/today', { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  const resetting = mode === 'reset'

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-mark" aria-hidden="true">
          <img src="/SAPPS_isotype_white_gold.png" alt="" style={{ width: '66%', height: '66%' }} />
        </div>
        <h1>SAPPS Polygraph</h1>
        <p className="lede">{resetting ? 'Reset your password' : 'Sign in to continue'}</p>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" inputMode="email"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {!resetting && (
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password"
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Working…' : resetting ? 'Email me a reset link' : 'Sign in'}
        </button>

        <div className="auth-toggle">
          {resetting ? (
            <button type="button" onClick={() => switchMode('signin')}>← Back to sign in</button>
          ) : (
            <button type="button" onClick={() => switchMode('reset')}>Forgot password?</button>
          )}
        </div>
        <div className="auth-toggle auth-toggle-sub">
          Need an account? Contact your SAPPS administrator.
        </div>
      </form>
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  const msg = err?.message || ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
    return "That email and password don't match. Passwords are case-sensitive — or use “Forgot password?” below."
  }
  if (err?.status === 429 || /rate limit|too many/i.test(msg)) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }
  if (/failed to fetch|network/i.test(msg)) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return msg || 'Something went wrong.'
}
