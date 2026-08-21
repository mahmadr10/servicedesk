import { Server } from "socket.io";
import { ITicket } from "../models/Ticket";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

// Broadcasts a ticket change to everyone who should see it live:
//  - the ticket's customer (their own room, "user:<id>") — so their ticket
//    view updates without a refresh.
//  - every agent/admin ("agents" room) — so the Ticket Queue updates live,
//    and specifically so that if Agent A reassigns a ticket to Agent B,
//    Agent B sees it appear without refreshing (the spec's exact example).
// Everyone in the "agents" room gets the SAME event; the frontend doesn't
// need per-agent targeting since agents can see all tickets anyway.
export function emitTicketUpdated(ticket: ITicket) {
  if (!ioInstance) return;
  const payload = ticket.toJSON();
  ioInstance.to(`user:${ticket.customer.toString()}`).emit("ticket:updated", payload);
  ioInstance.to("agents").emit("ticket:updated", payload);
}

export function emitNewTicket(ticket: ITicket) {
  if (!ioInstance) return;
  ioInstance.to("agents").emit("ticket:created", ticket.toJSON());
}
