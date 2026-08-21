import { api } from "./client";
import type {
  ApiSuccess,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  Comment,
} from "../types";

export async function createTicketRequest(input: {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}) {
  const res = await api.post<ApiSuccess<{ ticket: Ticket }>>("/tickets", input);
  return res.data.data.ticket;
}

export interface TicketListResult {
  tickets: Ticket[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listTicketsRequest(params: { status?: TicketStatus; page?: number; limit?: number }) {
  const res = await api.get<ApiSuccess<TicketListResult>>("/tickets", { params });
  return res.data.data;
}

export async function getTicketRequest(id: string) {
  const res = await api.get<ApiSuccess<{ ticket: Ticket }>>(`/tickets/${id}`);
  return res.data.data.ticket;
}

export async function updateTicketStatusRequest(id: string, status: TicketStatus) {
  const res = await api.patch<ApiSuccess<{ ticket: Ticket }>>(`/tickets/${id}/status`, { status });
  return res.data.data.ticket;
}

export async function assignTicketToSelfRequest(id: string) {
  const res = await api.post<ApiSuccess<{ ticket: Ticket }>>(`/tickets/${id}/assign`);
  return res.data.data.ticket;
}

export async function listCommentsRequest(ticketId: string) {
  const res = await api.get<ApiSuccess<{ comments: Comment[] }>>(`/tickets/${ticketId}/comments`);
  return res.data.data.comments;
}

export async function addCommentRequest(ticketId: string, text: string) {
  const res = await api.post<ApiSuccess<{ comment: Comment }>>(`/tickets/${ticketId}/comments`, { text });
  return res.data.data.comment;
}
