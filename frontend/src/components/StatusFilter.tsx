import { TICKET_STATUSES, type TicketStatus } from "../types";

export function StatusFilter({
  value,
  onChange,
}: {
  value: TicketStatus | "";
  onChange: (status: TicketStatus | "") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TicketStatus | "")}
      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
    >
      <option value="">All statuses</option>
      {TICKET_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
