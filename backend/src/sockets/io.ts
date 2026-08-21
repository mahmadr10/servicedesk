import { Server } from "socket.io";
import { ITicket } from "../models/Ticket";

// A tiny module to hold a reference to the single Socket.IO server instance,
// so services (which run business logic) can trigger real-time events
// without needing to know HOW sockets work — they just call emitTicketUpdated.
// This keeps Socket.IO details out of the service/business-logic layer.
let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

// Sends the updated ticket to ONE room: the room for that ticket's customer
// (named "user:<customerId>"). Every socket belonging to that customer
// (they might have the app open in two tabs) auto-joined this room on
// connect, so all of them get the update — this is how "customer sees
// live update without refreshing" works.
export function emitTicketUpdated(ticket: ITicket) {
  if (!ioInstance) return;
  ioInstance.to(`user:${ticket.customer.toString()}`).emit("ticket:updated", ticket.toJSON());
}
