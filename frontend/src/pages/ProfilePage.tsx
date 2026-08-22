import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Profile</h1>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
          <dd className="text-slate-800">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
          <dd className="text-slate-800">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Role</dt>
          <dd className="text-slate-800">{user.role}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Member since</dt>
          <dd className="text-slate-800">{new Date(user.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
    </div>
  );
}
