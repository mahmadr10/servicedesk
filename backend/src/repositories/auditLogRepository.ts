import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog";

export function recordAuditLog(entry: {
  actor: string | null;
  action: string;
  entity: string;
  entityId: string | Types.ObjectId;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}) {
  return AuditLog.create({
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    metadata: entry.metadata ?? {},
  });
}

export async function listAuditLogs(
  filter: { entity?: string; entityId?: string; actor?: string; action?: string },
  skip: number,
  limit: number
) {
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).populate("actor", "name email role"),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, total };
}
