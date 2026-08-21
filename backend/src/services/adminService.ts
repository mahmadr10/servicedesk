import * as userRepo from "../repositories/userRepository";
import * as categoryRepo from "../repositories/categoryRepository";
import * as slaRepo from "../repositories/slaPolicyRepository";
import { AppError } from "../utils/AppError";
import { JwtPayload } from "../utils/jwt";
import { UserRole } from "../models/User";
import { TicketPriority } from "../models/Ticket";
import { logAction } from "./auditLogService";

export async function listUsers(role: UserRole | undefined, page: number, limit: number) {
  const filter = role ? { role } : {};
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    userRepo.findUsers(filter, skip, limit),
    userRepo.countUsers(filter),
  ]);
  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function updateUser(
  targetId: string,
  updates: { role?: UserRole; isActive?: boolean },
  actor: JwtPayload
) {
  if (targetId === actor.userId && updates.isActive === false) {
    throw new AppError(400, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account.");
  }
  const before = await userRepo.findUserById(targetId);
  if (!before) throw new AppError(404, "NOT_FOUND", "User not found.");

  const updated = await userRepo.updateUser(targetId, updates);

  await logAction({
    actor: actor.userId,
    action: "USER_UPDATED",
    entity: "User",
    entityId: targetId,
    oldValue: { role: before.role, isActive: before.isActive },
    newValue: updates,
  });

  return updated;
}

export async function listCategories() {
  return categoryRepo.listAllCategories();
}

export async function createCategory(name: string, description: string | undefined, actor: JwtPayload) {
  const category = await categoryRepo.createCategory({ name, description });
  await logAction({
    actor: actor.userId,
    action: "CATEGORY_CREATED",
    entity: "Category",
    entityId: category._id.toString(),
    newValue: { name, description },
  });
  return category;
}

export async function setCategoryActive(id: string, isActive: boolean, actor: JwtPayload) {
  const category = await categoryRepo.setCategoryActive(id, isActive);
  if (!category) throw new AppError(404, "NOT_FOUND", "Category not found.");
  await logAction({
    actor: actor.userId,
    action: isActive ? "CATEGORY_ACTIVATED" : "CATEGORY_DEACTIVATED",
    entity: "Category",
    entityId: id,
  });
  return category;
}

export async function listSlaPolicies() {
  return slaRepo.listPolicies();
}

export async function upsertSlaPolicy(
  priority: TicketPriority,
  responseMinutes: number,
  resolutionMinutes: number,
  actor: JwtPayload
) {
  const before = await slaRepo.findPolicyForPriority(priority);
  const policy = await slaRepo.upsertPolicy(priority, responseMinutes, resolutionMinutes);
  await logAction({
    actor: actor.userId,
    action: "SLA_POLICY_UPDATED",
    entity: "SLAPolicy",
    entityId: policy._id.toString(),
    oldValue: before ? { responseMinutes: before.responseMinutes, resolutionMinutes: before.resolutionMinutes } : null,
    newValue: { responseMinutes, resolutionMinutes },
  });
  return policy;
}
