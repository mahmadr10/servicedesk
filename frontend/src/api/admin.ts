import { api } from "./client";
import type { ApiSuccess, Category, Pagination, SLAPolicy, TicketPriority, User, UserRole } from "../types";

export async function listUsersRequest(params: { role?: UserRole; page?: number; limit?: number }) {
  const res = await api.get<ApiSuccess<{ users: User[]; pagination: Pagination }>>("/admin/users", { params });
  return res.data.data;
}

export async function updateUserRequest(id: string, updates: { role?: UserRole; isActive?: boolean }) {
  const res = await api.patch<ApiSuccess<{ user: User }>>(`/admin/users/${id}`, updates);
  return res.data.data.user;
}

export async function listCategoriesRequest() {
  const res = await api.get<ApiSuccess<{ categories: Category[] }>>("/admin/categories");
  return res.data.data.categories;
}

export async function createCategoryRequest(name: string, description?: string) {
  const res = await api.post<ApiSuccess<{ category: Category }>>("/admin/categories", { name, description });
  return res.data.data.category;
}

export async function setCategoryActiveRequest(id: string, isActive: boolean) {
  const res = await api.patch<ApiSuccess<{ category: Category }>>(`/admin/categories/${id}`, { isActive });
  return res.data.data.category;
}

export async function listSlaPoliciesRequest() {
  const res = await api.get<ApiSuccess<{ policies: SLAPolicy[] }>>("/admin/sla-policies");
  return res.data.data.policies;
}

export async function upsertSlaPolicyRequest(
  priority: TicketPriority,
  responseMinutes: number,
  resolutionMinutes: number
) {
  const res = await api.put<ApiSuccess<{ policy: SLAPolicy }>>(`/admin/sla-policies/${priority}`, {
    responseMinutes,
    resolutionMinutes,
  });
  return res.data.data.policy;
}
