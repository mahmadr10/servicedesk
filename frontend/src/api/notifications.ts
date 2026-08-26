import { api } from "./client";
import type { ApiSuccess, Notification, Pagination } from "../types";

export async function listNotificationsRequest(page = 1, limit = 20) {
  const res = await api.get<ApiSuccess<{ notifications: Notification[]; pagination: Pagination }>>("/notifications", {
    params: { page, limit },
  });
  return res.data.data;
}

export async function getUnreadCountRequest() {
  const res = await api.get<ApiSuccess<{ count: number }>>("/notifications/unread-count");
  return res.data.data.count;
}

export async function markNotificationReadRequest(id: string) {
  const res = await api.patch<ApiSuccess<{ notification: Notification }>>(`/notifications/${id}/read`);
  return res.data.data.notification;
}

export async function markAllNotificationsReadRequest() {
  await api.patch("/notifications/read-all");
}
