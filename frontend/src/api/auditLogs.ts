import { api } from "./client";
import type { ApiSuccess, AuditLogEntry, Pagination } from "../types";

export async function listAuditLogsRequest(params: {
  entity?: string;
  entityId?: string;
  actor?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<ApiSuccess<{ logs: AuditLogEntry[]; pagination: Pagination }>>("/audit-logs", { params });
  return res.data.data;
}
