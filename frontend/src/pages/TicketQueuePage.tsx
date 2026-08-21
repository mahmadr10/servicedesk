import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignTicketToSelfRequest, listTicketsRequest } from "../api/tickets";
import { getApiErrorMessage } from "../api/client";
import type { Ticket, TicketStatus, User } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { StatusFilter } from "../components/StatusFilter";
import { Pagination } from "../components/Pagination";

export function TicketQueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listTicketsRequest({ status: status || undefined, page, limit: 10 })
      .then((result) => {
        setTickets(result.tickets);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, page]);

  async function handleAssign(ticketId: string) {
    setAssigningId(ticketId);
    setError(null);
    try {
      const updated = await assignTicketToSelfRequest(ticketId);
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? updated : t)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Ticket Queue</h1>
        <StatusFilter
          value={status}
          onChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
        />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && tickets.length === 0 && <p className="text-sm text-slate-500">No tickets found.</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {tickets.map((t) => {
          const agent = t.assignedAgent as User | null;
          const canAssign = t.status === "TRIAGED";
          return (
            <div
              key={t._id}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50"
            >
              <Link to={`/tickets/${t._id}`} className="flex-1">
                <p className="font-medium text-slate-800">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {t.category} · {t.priority}
                  {agent && ` · assigned to ${agent.name}`}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                {canAssign && (
                  <button
                    onClick={() => handleAssign(t._id)}
                    disabled={assigningId === t._id}
                    className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assigningId === t._id ? "Assigning…" : "Assign to me"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
