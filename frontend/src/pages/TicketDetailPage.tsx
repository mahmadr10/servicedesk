import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addCommentRequest,
  assignTicketToSelfRequest,
  getTicketRequest,
  listCommentsRequest,
  updateTicketStatusRequest,
} from "../api/tickets";
import { getApiErrorMessage } from "../api/client";
import { NEXT_STATUS, type Comment, type Ticket, type User } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getTicketRequest(id), listCommentsRequest(id)])
      .then(([t, c]) => {
        setTicket(t);
        setComments(c);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id]);

  // Live updates: if this exact ticket changes (status/assignment) while
  // we're looking at it, patch it in place. See MyTicketsPage for the note
  // on why the cleanup function matters for avoiding duplicate listeners.
  useEffect(() => {
    function handleUpdate(updated: Ticket) {
      if (updated._id === id) setTicket(updated);
    }
    socket.on("ticket:updated", handleUpdate);
    return () => {
      socket.off("ticket:updated", handleUpdate);
    };
  }, [id]);

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const comment = await addCommentRequest(id, commentText.trim());
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!id || !ticket) return;
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateTicketStatusRequest(id, next);
      setTicket(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await assignTicketToSelfRequest(id);
      setTicket(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !ticket) return <p className="mt-8 text-center text-sm text-red-600">{error}</p>;
  if (!ticket) return <p className="mt-8 text-center text-sm text-slate-500">Loading…</p>;

  const customer = ticket.customer as User;
  const agent = ticket.assignedAgent as User | null;
  const nextStatus = NEXT_STATUS[ticket.status];

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">{ticket.title}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="mb-4 text-sm text-slate-600">{ticket.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <p>Category: {ticket.category}</p>
          <p>Priority: {ticket.priority}</p>
          <p>Customer: {customer?.name ?? "—"}</p>
          <p>Agent: {agent?.name ?? "Unassigned"}</p>
        </div>

        {user?.role === "AGENT" && (
          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            {ticket.status === "TRIAGED" && !agent && (
              <button
                onClick={handleAssign}
                disabled={busy}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Assign to me
              </button>
            )}
            {nextStatus && (
              <button
                onClick={handleAdvanceStatus}
                disabled={busy}
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                Move to {nextStatus.replace("_", " ")}
              </button>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Comments</h2>
        <div className="flex flex-col gap-3">
          {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
          {comments.map((c) => {
            const author = c.author as User;
            return (
              <div key={c._id} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-slate-500">
                  {author?.name ?? "Unknown"} · {c.authorRole}
                </p>
                <p className="text-slate-700">{c.text}</p>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !commentText.trim()}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
