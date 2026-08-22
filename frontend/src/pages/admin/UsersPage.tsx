import { useState } from "react";
import type { UserRole } from "../../types";
import { useUpdateUser, useUsers } from "../../hooks/useAdmin";
import { Pagination } from "../../components/Pagination";
import { getApiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const ROLES: UserRole[] = ["CUSTOMER", "AGENT", "ADMIN"];

export function UsersPage() {
  const { user: me } = useAuth();
  const [role, setRole] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUsers({ role: role || undefined, page, limit: 20 });
  const updateUser = useUpdateUser();
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRoleChange(id: string, newRole: UserRole) {
    setActionError(null);
    try {
      await updateUser.mutateAsync({ id, updates: { role: newRole } });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    setActionError(null);
    try {
      await updateUser.mutateAsync({ id, updates: { isActive: !isActive } });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole | "");
            setPage(1);
          }}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{getApiErrorMessage(error)}</p>}
      {actionError && <p className="mb-2 text-sm text-red-600">{actionError}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u._id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value as UserRole)}
                      disabled={u._id === me?._id}
                      className="rounded border border-slate-300 px-1.5 py-1 text-xs disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u._id, u.isActive)}
                      disabled={u._id === me?._id}
                      className={`rounded px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                        u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {u.isActive ? "Active" : "Deactivated"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
