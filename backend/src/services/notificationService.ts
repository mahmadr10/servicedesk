import * as notificationRepo from "../repositories/notificationRepository";

export async function listMyNotifications(userId: string, page: number, limit: number) {
  const [notifications, total] = await notificationRepo.listForUser(userId, { page, limit });
  return { notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export function getUnreadCount(userId: string) {
  return notificationRepo.countUnread(userId);
}

export function markRead(id: string, userId: string) {
  return notificationRepo.markRead(id, userId);
}

export function markAllRead(userId: string) {
  return notificationRepo.markAllRead(userId);
}
