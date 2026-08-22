import { useState } from "react";
import { TICKET_PRIORITIES, type TicketPriority } from "../../types";
import {
  useCategories,
  useCreateCategory,
  useSetCategoryActive,
  useSlaPolicies,
  useUpsertSlaPolicy,
} from "../../hooks/useAdmin";
import { getApiErrorMessage } from "../../api/client";

function CategoriesPanel() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const setActive = useSetCategoryActive();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createCategory.mutateAsync({ name: name.trim() });
      setName("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Categories</h2>
      <ul className="mb-4 flex flex-col gap-1">
        {categories?.map((c) => (
          <li key={c._id} className="flex items-center justify-between text-sm">
            <span className={c.isActive ? "text-slate-700" : "text-slate-400 line-through"}>{c.name}</span>
            <button
              onClick={() => setActive.mutate({ id: c._id, isActive: !c.isActive })}
              className="text-xs text-blue-600 hover:underline"
            >
              {c.isActive ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SlaPoliciesPanel() {
  const { data: policies } = useSlaPolicies();
  const upsert = useUpsertSlaPolicy();
  const [error, setError] = useState<string | null>(null);

  async function handleSave(priority: TicketPriority, responseMinutes: number, resolutionMinutes: number) {
    setError(null);
    try {
      await upsert.mutateAsync({ priority, responseMinutes, resolutionMinutes });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">SLA Policies (minutes)</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="py-1 font-medium">Priority</th>
            <th className="py-1 font-medium">Response</th>
            <th className="py-1 font-medium">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {TICKET_PRIORITIES.map((p) => {
            const policy = policies?.find((pol) => pol.priority === p);
            return (
              <tr key={p}>
                <td className="py-1.5 text-slate-700">{p}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    defaultValue={policy?.responseMinutes}
                    key={`${p}-response-${policy?.responseMinutes}`}
                    onBlur={(e) =>
                      handleSave(p, Number(e.target.value), policy?.resolutionMinutes ?? 60)
                    }
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number"
                    defaultValue={policy?.resolutionMinutes}
                    key={`${p}-resolution-${policy?.resolutionMinutes}`}
                    onBlur={(e) =>
                      handleSave(p, policy?.responseMinutes ?? 15, Number(e.target.value))
                    }
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">Changes save on blur.</p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Settings</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CategoriesPanel />
        <SlaPoliciesPanel />
      </div>
    </div>
  );
}
