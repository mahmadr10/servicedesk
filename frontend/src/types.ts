// Mirrors the backend's Mongoose models/enums (see backend/src/models/*.ts).

export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type TicketStatus =
  | "OPEN"
  | "TRIAGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export interface TicketAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface SlaInfo {
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseRemainingMs: number;
  resolutionRemainingMs: number;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  tags: string[];
  customer: User | string;
  assignedAgent: User | string | null;
  attachments: TicketAttachment[];
  responseDeadline: string;
  resolutionDeadline: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sla: SlaInfo;
  // Only present on the single-ticket GET (not list) — the server's
  // authoritative answer to "which status buttons should I show."
  allowedNextStatuses?: TicketStatus[];
}

export interface Comment {
  _id: string;
  ticket: string;
  author: User | string;
  authorRole: UserRole;
  text: string;
  isInternal: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface SLAPolicy {
  _id: string;
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
}

export interface AuditLogEntry {
  _id: string;
  actor: User | string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  slaBreaches: number;
  avgResolutionMinutes: number;
}

export interface DashboardAnalytics {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byAgent: { agentId: string; name: string; email: string; count: number }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
