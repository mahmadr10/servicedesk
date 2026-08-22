import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { TICKET_PRIORITIES } from "../types";
import { createTicketSchema, type CreateTicketForm } from "../validation";
import { useCreateTicket } from "../hooks/useTickets";
import { useActiveCategories } from "../hooks/useAdmin";
import { getApiErrorMessage } from "../api/client";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const { data: categories } = useActiveCategories();
  const createTicket = useCreateTicket();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketForm>({ resolver: zodResolver(createTicketSchema), defaultValues: { priority: "MEDIUM" } });

  async function onSubmit(data: CreateTicketForm) {
    setError(null);
    try {
      const tags = data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      const ticket = await createTicket.mutateAsync({ ...data, tags });
      navigate(`/tickets/${ticket._id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Create a ticket</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <input
            placeholder="Title"
            {...register("title")}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <textarea
            rows={5}
            placeholder="Describe the issue…"
            {...register("description")}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>
        <div className="flex gap-4">
          <label className="flex-1 text-sm text-slate-600">
            Category
            <select {...register("category")} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {categories?.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
          </label>
          <label className="flex-1 text-sm text-slate-600">
            Priority
            <select {...register("priority")} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <input
            placeholder="Tags (comma-separated, optional)"
            {...register("tags")}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
