import { Request, Response } from "express";
import * as ticketService from "../services/ticketService";

export async function createTicket(req: Request, res: Response) {
  const ticket = await ticketService.createTicket(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: { ticket } });
}

export async function listTickets(req: Request, res: Response) {
  const result = await ticketService.listTickets(req.user!, req.query as any);
  res.status(200).json({ success: true, data: result });
}

export async function getTicket(req: Request, res: Response) {
  const ticket = await ticketService.getTicketById(req.params.id as string, req.user!);
  res.status(200).json({ success: true, data: { ticket } });
}

export async function updateStatus(req: Request, res: Response) {
  const ticket = await ticketService.updateTicketStatus(req.params.id as string, req.body.status);
  res.status(200).json({ success: true, data: { ticket } });
}

export async function assignToSelf(req: Request, res: Response) {
  const ticket = await ticketService.assignTicketToSelf(req.params.id as string, req.user!);
  res.status(200).json({ success: true, data: { ticket } });
}
