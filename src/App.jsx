import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppNav from './components/AppNav'
import LoginPage from './pages/LoginPage'
import CalendarPage from './pages/CalendarPage'
import PayrollPage from './pages/PayrollPage'
import InvoicePage from './pages/InvoicePage'

// Authenticated shell: nav + routed content.
function AppLayout() {
  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<CalendarPage />} />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute requireRole="payroll_admin">
                  <PayrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoicing"
              element={
                <ProtectedRoute requireRole="payroll_admin">
                  <InvoicePage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
