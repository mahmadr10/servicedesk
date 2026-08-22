import { api } from "./client";
import type { ApiSuccess, DashboardAnalytics, DashboardSummary } from "../types";

export async function getDashboardSummaryRequest() {
  const res = await api.get<ApiSuccess<DashboardSummary>>("/dashboard/summary");
  return res.data.data;
}

export async function getDashboardAnalyticsRequest() {
  const res = await api.get<ApiSuccess<DashboardAnalytics>>("/dashboard/analytics");
  return res.data.data;
}
