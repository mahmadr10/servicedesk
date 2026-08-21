import { Request, Response } from "express";
import * as adminService from "../services/adminService";

export async function listUsers(req: Request, res: Response) {
  const { role, page, limit } = req.query as any;
  const result = await adminService.listUsers(role, page, limit);
  res.status(200).json({ success: true, data: result });
}

export async function updateUser(req: Request, res: Response) {
  const user = await adminService.updateUser(req.params.id as string, req.body, req.user!);
  res.status(200).json({ success: true, data: { user } });
}

export async function listCategories(_req: Request, res: Response) {
  const categories = await adminService.listCategories();
  res.status(200).json({ success: true, data: { categories } });
}

export async function createCategory(req: Request, res: Response) {
  const category = await adminService.createCategory(req.body.name, req.body.description, req.user!);
  res.status(201).json({ success: true, data: { category } });
}

export async function setCategoryActive(req: Request, res: Response) {
  const category = await adminService.setCategoryActive(req.params.id as string, req.body.isActive, req.user!);
  res.status(200).json({ success: true, data: { category } });
}

export async function listSlaPolicies(_req: Request, res: Response) {
  const policies = await adminService.listSlaPolicies();
  res.status(200).json({ success: true, data: { policies } });
}

export async function upsertSlaPolicy(req: Request, res: Response) {
  const policy = await adminService.upsertSlaPolicy(
    req.params.priority as any,
    req.body.responseMinutes,
    req.body.resolutionMinutes,
    req.user!
  );
  res.status(200).json({ success: true, data: { policy } });
}
