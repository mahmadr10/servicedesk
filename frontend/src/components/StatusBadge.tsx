import type { TicketStatus } from "../types";

// A small color-coded pill for ticket status, reused on every list/detail
// view so status is recognizable at a glance instead of just plain text.
const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-slate-100 text-slate-700",
  TRIAGED: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-gray-200 text-gray-500",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}
