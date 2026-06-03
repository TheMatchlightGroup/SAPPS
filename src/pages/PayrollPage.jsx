// STUB — admin-only. The submissions table + CSV export land in a later step.
export default function PayrollPage() {
  return (
    <div>
      <div className="page-head">
        <h2>Payroll Dashboard</h2>
        <p>Admin-only. Weekly submissions, examiner status, and exports go here.</p>
      </div>
      <div className="stub-card">
        <span className="tag">Admin view</span>
        <p style={{ margin: 0 }}>
          If you can see this page, your role is <strong>payroll_admin</strong> and
          role-based routing is working. The submissions table comes next.
        </p>
      </div>
    </div>
  )
}
