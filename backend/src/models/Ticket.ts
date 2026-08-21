import { Schema, model, Document, Types } from "mongoose";

// The full list of statuses a ticket can ever be in, in the order the state
// machine allows. This array is also reused by the service layer to check
// "is this the next legal status" — one source of truth.
export const TICKET_STATUSES = [
  "OPEN",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = ["TECHNICAL", "BILLING", "ACCOUNT", "OTHER"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface ITicket extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customer: Types.ObjectId;
  assignedAgent: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    priority: { type: String, enum: TICKET_PRIORITIES, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: "OPEN" },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedAgent: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Ticket = model<ITicket>("Ticket", ticketSchema);
