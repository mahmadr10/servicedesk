export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
