import { z } from "zod";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "../models/Ticket";

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// Query params always arrive as strings (e.g. "?page=2"), so we coerce them
// to numbers here rather than trusting the frontend to send numbers.
export const listTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const updateStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// Basic 24-character hex check for a Mongo ObjectId, so we reject junk IDs
// with a clean 400 error instead of a confusing database error.
export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id format"),
});
