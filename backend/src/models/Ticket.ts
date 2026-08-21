import { Schema, model, Document, Types } from "mongoose";

// The full status graph now BRANCHES (IN_PROGRESS can go two different
// places), so it's no longer "one next status" — see
// services/ticketService.ts TRANSITIONS map for the actual rules. This list
// is just every status that exists.
export const TICKET_STATUSES = [
  "OPEN",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface ITicketAttachment {
  _id?: Types.ObjectId;
  filename: string; // name on disk (random, avoids collisions/path traversal)
  originalName: string; // name to show the user
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

const attachmentSchema = new Schema<ITicketAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

export interface ITicket extends Document {
  _id: Types.ObjectId;
  ticketNumber: string; // human-friendly id, e.g. "TCK-000042"
  title: string;
  description: string;
  category: string; // validated against the Category collection at write time
  priority: TicketPriority;
  status: TicketStatus;
  tags: string[];
  customer: Types.ObjectId;
  assignedAgent: Types.ObjectId | null;
  attachments: ITicketAttachment[];

  // SLA fields — set once, from the SLA policy in effect at creation time
  // (see slaService.ts). Storing the actual deadline (not just "15 minutes")
  // means we can index and query "which tickets are overdue RIGHT NOW"
  // efficiently, and it's immune to a later policy change silently
  // reshaping an already-running ticket's deadline.
  responseDeadline: Date;
  resolutionDeadline: Date;
  firstResponseAt: Date | null; // set when an agent's first comment/action lands
  resolvedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    priority: { type: String, enum: TICKET_PRIORITIES, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: "OPEN", index: true },
    tags: { type: [String], default: [] },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedAgent: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    attachments: { type: [attachmentSchema], default: [] },
    responseDeadline: { type: Date, required: true },
    resolutionDeadline: { type: Date, required: true },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound indexes for the query patterns the ticket queue/dashboard
// actually run: "an agent's queue filtered by status, newest first" and
// "a customer's tickets filtered by status, newest first" are both covered
// by a (field, status, createdAt) index — MongoDB can satisfy the filter AND
// the sort from the index alone, without a separate in-memory sort step.
ticketSchema.index({ assignedAgent: 1, status: 1, createdAt: -1 });
ticketSchema.index({ customer: 1, status: 1, createdAt: -1 });
ticketSchema.index({ priority: 1, status: 1 });

export const Ticket = model<ITicket>("Ticket", ticketSchema);
