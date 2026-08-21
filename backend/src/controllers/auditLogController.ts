import { Request, Response } from "express";
import { listAuditLogs } from "../repositories/auditLogRepository";

export async function getAuditLogs(req: Request, res: Response) {
  const { entity, entityId, actor, action, page, limit } = req.query as any;
  const skip = (page - 1) * limit;
  const { logs, total } = await listAuditLogs({ entity, entityId, actor, action }, skip, limit);
  res.status(200).json({
    success: true,
    data: { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
  });
}
