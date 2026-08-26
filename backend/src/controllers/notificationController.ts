import { Request, Response } from "express";
import * as notificationService from "../services/notificationService";

export async function listNotifications(req: Request, res: Response) {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await notificationService.listMyNotifications(req.user!.userId, page, limit);
  res.status(200).json({ success: true, data: result });
}

export async function getUnreadCount(req: Request, res: Response) {
  const count = await notificationService.getUnreadCount(req.user!.userId);
  res.status(200).json({ success: true, data: { count } });
}

export async function markRead(req: Request, res: Response) {
  const notification = await notificationService.markRead(req.params.id as string, req.user!.userId);
  res.status(200).json({ success: true, data: { notification } });
}

export async function markAllRead(req: Request, res: Response) {
  await notificationService.markAllRead(req.user!.userId);
  res.status(200).json({ success: true, data: {} });
}
