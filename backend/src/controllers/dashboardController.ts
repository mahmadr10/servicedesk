import { Request, Response } from "express";
import * as dashboardService from "../services/dashboardService";

export async function getSummary(_req: Request, res: Response) {
  const summary = await dashboardService.getSummary();
  res.status(200).json({ success: true, data: summary });
}

export async function getAnalytics(_req: Request, res: Response) {
  const analytics = await dashboardService.getAnalytics();
  res.status(200).json({ success: true, data: analytics });
}
