import { Ticket, TicketStatus, ITicket } from "../models/Ticket";
import { JwtPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { CreateTicketInput, ListTicketsQuery } from "../validators/ticketValidators";
import { emitTicketUpdated } from "../sockets/io";

// ── The state machine ──────────────────────────────────────────────────
// A ticket can only ever move to ONE specific next status. This map is the
// single source of truth for "what's a legal move" — everywhere else in the
// app (routes, controllers, tests) defers to this instead of re-implementing
// the rule. `null` means "terminal state, nothing comes after this."
const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  OPEN: "TRIAGED",
  TRIAGED: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
  CLOSED: null,
};

// Exported on its own (no database, no I/O) specifically so it's easy to
// unit test in isolation — this is the highest-value place to have tests,
// since it's the rule the whole app depends on being correct.
export function isLegalTransition(current: TicketStatus, next: TicketStatus): boolean {
  return NEXT_STATUS[current] === next;
}

async function findTicketOr404(ticketId: string): Promise<ITicket> {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, "NOT_FOUND", "Ticket not found.");
  }
  return ticket;
}

// Confirms a customer can only see their OWN ticket; an agent can see any.
function assertCanView(ticket: ITicket, user: JwtPayload) {
  if (user.role === "CUSTOMER" && ticket.customer.toString() !== user.userId) {
    throw new AppError(403, "FORBIDDEN", "You can only view your own tickets.");
  }
}

export async function createTicket(customerId: string, input: CreateTicketInput) {
  const ticket = await Ticket.create({
    ...input,
    customer: customerId,
    status: "OPEN",
  });
  return ticket;
}

export async function listTickets(user: JwtPayload, query: ListTicketsQuery) {
  const filter: Record<string, unknown> = {};

  // Customers only ever see their own tickets — enforced here in the query
  // itself, not just by hiding other tickets in the UI.
  if (user.role === "CUSTOMER") {
    filter.customer = user.userId;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate("customer", "name email")
      .populate("assignedAgent", "name email"),
    Ticket.countDocuments(filter),
  ]);

  return {
    tickets,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function getTicketById(ticketId: string, user: JwtPayload) {
  const ticket = await Ticket.findById(ticketId)
    .populate("customer", "name email")
    .populate("assignedAgent", "name email");
  if (!ticket) {
    throw new AppError(404, "NOT_FOUND", "Ticket not found.");
  }
  assertCanView(ticket, user);
  return ticket;
}

export async function updateTicketStatus(ticketId: string, requestedStatus: TicketStatus) {
  const ticket = await findTicketOr404(ticketId);

  if (!isLegalTransition(ticket.status, requestedStatus)) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      `A ticket cannot move from ${ticket.status} directly to ${requestedStatus}.`
    );
  }

  ticket.status = requestedStatus;
  await ticket.save();
  emitTicketUpdated(ticket);
  return ticket;
}

// Design decision: in this state machine, "assigning an agent" is the
// specific action that moves a ticket from TRIAGED to ASSIGNED (that's why
// ASSIGNED sits right after TRIAGED). So assigning is only legal once a
// ticket has been triaged — trying to assign an OPEN or already-ASSIGNED
// ticket is rejected, same as any other illegal transition.
export async function assignTicketToSelf(ticketId: string, agent: JwtPayload) {
  const ticket = await findTicketOr404(ticketId);

  if (!isLegalTransition(ticket.status, "ASSIGNED")) {
    throw new AppError(
      400,
      "INVALID_STATUS_TRANSITION",
      `A ticket cannot move from ${ticket.status} directly to ASSIGNED. It must be TRIAGED first.`
    );
  }

  ticket.assignedAgent = agent.userId as any;
  ticket.status = "ASSIGNED";
  await ticket.save();
  emitTicketUpdated(ticket);
  return ticket;
}
