// These mirror the backend's Mongoose models/enums exactly (see
// backend/src/models/Ticket.ts, User.ts). Keeping them in one file makes it
// obvious when frontend and backend drift out of sync.

export type UserRole = "CUSTOMER" | "AGENT";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type TicketStatus =
  | "OPEN"
  | "TRIAGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

// The one legal "next status" for each current status — mirrors the
// backend's NEXT_STATUS map. Used only to decide which button to SHOW the
// agent; the server re-checks this rule independently and is the real gate.
export const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  OPEN: "TRIAGED",
  TRIAGED: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: null,
};

export type TicketCategory = "TECHNICAL" | "BILLING" | "ACCOUNT" | "OTHER";
export const TICKET_CATEGORIES: TicketCategory[] = ["TECHNICAL", "BILLING", "ACCOUNT", "OTHER"];

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customer: User | string;
  assignedAgent: User | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  ticket: string;
  author: User | string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

// The consistent envelope every API response uses (success cases). Errors
// use { success: false, error: { code, message } } — see api/client.ts.
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
