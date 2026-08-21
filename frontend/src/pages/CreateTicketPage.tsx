import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicketRequest } from "../api/tickets";
import { getApiErrorMessage } from "../api/client";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketCategory, type TicketPriority } from "../types";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("TECHNICAL");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Frontend validation: quick, friendly feedback without a round trip.
    // The server (Zod schemas) enforces the same rules independently — the
    // frontend check can be bypassed (devtools, curl), so it's UX only,
    // never the real gate.
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createTicketRequest({ title, description, category, priority });
      navigate(`/tickets/${ticket._id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Create a ticket</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <textarea
          required
          rows={5}
          placeholder="Describe the issue…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <div className="flex gap-4">
          <label className="flex-1 text-sm text-slate-600">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm text-slate-600">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
