import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-slate-600 hover:text-slate-900">
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-3">
      <Link to="/" className="text-lg font-semibold text-slate-800">
        ServiceDesk
      </Link>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {user?.role === "CUSTOMER" && (
          <>
            <NavLink to="/tickets/new">New Ticket</NavLink>
            <NavLink to="/">My Tickets</NavLink>
          </>
        )}
        {user?.role === "AGENT" && (
          <>
            <NavLink to="/">Ticket Queue</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
          </>
        )}
        {user?.role === "ADMIN" && (
          <>
            <NavLink to="/">Admin Dashboard</NavLink>
            <NavLink to="/admin/tickets">Tickets</NavLink>
            <NavLink to="/admin/users">Users</NavLink>
            <NavLink to="/admin/analytics">Analytics</NavLink>
            <NavLink to="/admin/audit-logs">Audit Logs</NavLink>
            <NavLink to="/admin/settings">Settings</NavLink>
            <NavLink to="/admin/dev-assistant">Dev Assistant</NavLink>
          </>
        )}
        {user && <NavLink to="/profile">Profile</NavLink>}
        {user && (
          <>
            <span className="text-slate-400">
              {user.name} · {user.role}
            </span>
            <button onClick={handleLogout} className="rounded bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200">
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
