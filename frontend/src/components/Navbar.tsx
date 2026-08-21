import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <Link to="/" className="text-lg font-semibold text-slate-800">
        ServiceDesk
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user?.role === "CUSTOMER" && (
          <>
            <Link to="/tickets/new" className="text-slate-600 hover:text-slate-900">
              New Ticket
            </Link>
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              My Tickets
            </Link>
          </>
        )}
        {user?.role === "AGENT" && (
          <Link to="/" className="text-slate-600 hover:text-slate-900">
            Ticket Queue
          </Link>
        )}
        {user && (
          <>
            <span className="text-slate-400">{user.name} · {user.role}</span>
            <button
              onClick={handleLogout}
              className="rounded bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
