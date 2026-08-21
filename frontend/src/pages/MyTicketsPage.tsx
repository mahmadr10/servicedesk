import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTicketsRequest } from "../api/tickets";
import { getApiErrorMessage } from "../api/client";
import type { Ticket, TicketStatus } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { StatusFilter } from "../components/StatusFilter";
import { Pagination } from "../components/Pagination";
import { socket } from "../socket";

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listTicketsRequest({ status: status || undefined, page, limit: 10 })
      .then((result) => {
        setTickets(result.tickets);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, page]);

  // Real-time: when an agent updates one of MY tickets (status change or
  // assignment), the backend emits "ticket:updated" to my personal socket
  // room. If that ticket is currently visible in this list, patch it in
  // place — no refetch, no page reload.
  //
  // Avoiding ghost/duplicate listeners: this effect's cleanup function
  // (the `return () => ...` below) removes the listener whenever the
  // component re-renders this effect or unmounts. Without that cleanup,
  // navigating away and back would stack up multiple listeners, and a
  // single server event would apply the same update several times.
  useEffect(() => {
    function handleUpdate(updated: Ticket) {
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    }
    socket.on("ticket:updated", handleUpdate);
    return () => {
      socket.off("ticket:updated", handleUpdate);
    };
  }, []);

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">My Tickets</h1>
        <StatusFilter
          value={status}
          onChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && tickets.length === 0 && (
        <p className="text-sm text-slate-500">No tickets yet. Create one to get started.</p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {tickets.map((t) => (
          <Link
            key={t._id}
            to={`/tickets/${t._id}`}
            className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-800">{t.title}</p>
              <p className="text-xs text-slate-500">
                {t.category} · {t.priority}
              </p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
