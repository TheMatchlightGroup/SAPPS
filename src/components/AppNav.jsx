import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppNav() {
  const { pathname } = useLocation()
  const { profile, role, signOut } = useAuth()

  // Payroll dashboard is admin-only; only show the link to admins.
  const showPayroll = role === 'payroll_admin'

  return (
    <nav className="app-nav">
      <div className="nav-brand">
        {/* Slot for the SA-monogram-with-scales SVG once provided.
            Until then, a clean text mark in the brand circle. */}
        <span className="nav-mark" aria-hidden="true">SA</span>
        <h1>SAPPS <span className="sub">Polygraph</span></h1>
      </div>

      <div className="nav-right">
        <div className="nav-links">
          <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Calendar
          </Link>
          {showPayroll && (
            <Link
              to="/payroll"
              className={`nav-link ${pathname === '/payroll' ? 'active' : ''}`}
            >
              Payroll
            </Link>
          )}
          {showPayroll && (
            <Link
              to="/invoicing"
              className={`nav-link ${pathname === '/invoicing' ? 'active' : ''}`}
            >
              Invoicing
            </Link>
          )}
        </div>

        {profile && (
          <span className="nav-user">
            <strong>{profile.name}</strong>
            <span className="role-pill">{role?.replace('_', ' ')}</span>
          </span>
        )}
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    </nav>
  )
}
