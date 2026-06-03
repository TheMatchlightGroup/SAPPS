import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireRole }) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return <div className="center-screen">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // requireRole can be a string or an array of allowed roles.
  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole]
    if (!allowed.includes(role)) {
      // Authenticated but not permitted — send back to the calendar.
      return <Navigate to="/" replace />
    }
  }

  return children
}
