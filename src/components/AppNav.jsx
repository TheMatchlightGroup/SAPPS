import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ChangePasswordModal from './ChangePasswordModal'

export default function AppNav() {
  const { pathname } = useLocation()
  const { profile, role, signOut } = useAuth()

  // Today / Payroll / Invoicing are admin-only; examiners just see Calendar.
  const isAdmin = role === 'payroll_admin'
  const [pwOpen, setPwOpen] = useState(false)
  const mustChange = Boolean(profile?.must_change_password)

  return (
    <>
    <nav className="app-nav">
      <div className="nav-brand">
        <span className="nav-mark" aria-hidden="true">
          <img src="/SAPPS_isotype_white_gold.png" alt="" style={{ width: '70%', height: '70%' }} />
        </span>
        <h1>SAPPS <span className="sub">Polygraph</span></h1>
      </div>

      <div className="nav-right">
        <div className="nav-links">
          {isAdmin && (
            <Link to="/today" className={`nav-link ${pathname === '/today' ? 'active' : ''}`}>
              Today
            </Link>
          )}
          <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Calendar
          </Link>
          <Link to="/reports" className={`nav-link ${pathname.startsWith('/reports') ? 'active' : ''}`}>
            Reports
          </Link>
          {isAdmin && (
            <Link to="/payroll" className={`nav-link ${pathname === '/payroll' ? 'active' : ''}`}>
              Payroll
            </Link>
          )}
          {isAdmin && (
            <Link to="/invoicing" className={`nav-link ${pathname === '/invoicing' ? 'active' : ''}`}>
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
        <button className="btn btn-ghost nav-pw" onClick={() => setPwOpen(true)} title="Change password">Change password</button>
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    </nav>
    {mustChange && !pwOpen && (
      <div className="pw-banner" role="status">
        <span>You're signed in with a temporary password.</span>
        <button className="pw-banner-btn" onClick={() => setPwOpen(true)}>Set your own password →</button>
      </div>
    )}
    {pwOpen && <ChangePasswordModal required={mustChange} onClose={() => setPwOpen(false)} />}
    </>
  )
}
