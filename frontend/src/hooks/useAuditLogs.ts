import { useQuery } from "@tanstack/react-query";
import { listAuditLogsRequest } from "../api/auditLogs";

export function useAuditLogs(params: { entity?: string; action?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: ["admin", "audit-logs", params], queryFn: () => listAuditLogsRequest(params) });
}
