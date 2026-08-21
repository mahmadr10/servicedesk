import { Comment } from "../models/Comment";
import { Ticket } from "../models/Ticket";
import { AppError } from "../utils/AppError";
import { JwtPayload } from "../utils/jwt";

async function assertTicketVisible(ticketId: string, user: JwtPayload) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, "NOT_FOUND", "Ticket not found.");
  }
  if (user.role === "CUSTOMER" && ticket.customer.toString() !== user.userId) {
    throw new AppError(403, "FORBIDDEN", "You can only comment on your own tickets.");
  }
  return ticket;
}

export async function addComment(ticketId: string, user: JwtPayload, text: string) {
  await assertTicketVisible(ticketId, user);

  const comment = await Comment.create({
    ticket: ticketId,
    author: user.userId,
    authorRole: user.role,
    text,
  });
  return comment.populate("author", "name email");
}

export async function listComments(ticketId: string, user: JwtPayload) {
  await assertTicketVisible(ticketId, user);

  return Comment.find({ ticket: ticketId })
    .sort({ createdAt: 1 })
    .populate("author", "name email");
}
