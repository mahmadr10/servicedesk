import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["CUSTOMER", "AGENT", "ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateUserSchema = z.object({
  role: z.enum(["CUSTOMER", "AGENT", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(200).optional(),
});

export const setCategoryActiveSchema = z.object({
  isActive: z.boolean(),
});

export const askDevAssistantSchema = z.object({
  question: z.string().trim().min(5, "Ask a real question (min 5 characters).").max(500),
});

export const applyDevAssistantFixSchema = z.object({
  targetFile: z.string().trim().min(1).max(300),
  oldCode: z.string().min(1).max(5000),
  newCode: z.string().min(1).max(5000),
});

export const upsertSlaPolicySchema = z.object({
  responseMinutes: z.coerce.number().int().min(1),
  resolutionMinutes: z.coerce.number().int().min(1),
});
