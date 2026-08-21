import * as dashboardRepo from "../repositories/dashboardRepository";

function toCountMap(rows: { _id: string; count: number }[]) {
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

export async function getSummary() {
  const [counts, slaBreaches, avgResolutionMinutes] = await Promise.all([
    dashboardRepo.getTotalAndOpenCounts(),
    dashboardRepo.getSlaBreachCount(),
    dashboardRepo.getAverageResolutionMinutes(),
  ]);
  return { ...counts, slaBreaches, avgResolutionMinutes: Math.round(avgResolutionMinutes) };
}

export async function getAnalytics() {
  const [byStatus, byPriority, byCategory, byAgent] = await Promise.all([
    dashboardRepo.getStatusCounts(),
    dashboardRepo.getPriorityCounts(),
    dashboardRepo.getCategoryCounts(),
    dashboardRepo.getAgentCounts(),
  ]);
  return {
    byStatus: toCountMap(byStatus),
    byPriority: toCountMap(byPriority),
    byCategory: toCountMap(byCategory),
    byAgent: byAgent.map((a) => ({ agentId: a._id, name: a.name, email: a.email, count: a.count })),
  };
}
