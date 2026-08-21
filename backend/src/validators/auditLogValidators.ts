import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entity: z.string().trim().optional(),
  entityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  actor: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  action: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
