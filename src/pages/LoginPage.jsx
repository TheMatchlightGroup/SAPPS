import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

// Sign-in only. Account creation is admin-managed (decided on the 8/8 review
// call): new examiners are provisioned on the database side with a temporary
// password, then reset it themselves. The signUp path still exists in
// AuthContext for the day self-serve onboarding makes sense — it just has no
// front door here.
export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    setBusy(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      // Admins land on the Today hub; examiners are redirected to the
      // calendar by the /today route guard.
      navigate('/today', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true">
          <img src="/SAPPS_isotype_white_gold.png" alt="" style={{ width: '66%', height: '66%' }} />
        </div>
        <h1>SAPPS Polygraph</h1>
        <p className="lede">Sign in to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Working…' : 'Sign in'}
        </button>

        <div className="auth-toggle">
          Need an account? Contact your SAPPS administrator.
        </div>
      </div>
    </div>
  )
}
