import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function handleSubmit() {
    setError('')
    setNotice('')
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/', { replace: true })
      } else {
        const { data, error } = await signUp(email, password, name)
        if (error) throw error
        // If email confirmation is on, there's no session yet.
        if (data.session) {
          navigate('/', { replace: true })
        } else {
          setNotice('Account created. Check your email to confirm, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true">SA</div>
        <h1>SAPPS Polygraph</h1>
        <p className="lede">
          {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-error" style={{ background: 'rgba(62,107,79,.16)', borderColor: 'rgba(62,107,79,.5)', color: '#C7E0CF' }}>{notice}</div>}

        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <div className="auth-toggle">
          {mode === 'signin' ? (
            <>New here? <button onClick={() => { setMode('signup'); setError('') }}>Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('signin'); setError('') }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
