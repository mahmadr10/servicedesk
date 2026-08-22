import { StatCard } from "../components/StatCard";
import { BarChartCard } from "../components/BarChartCard";
import { useDashboardAnalytics, useDashboardSummary } from "../hooks/useDashboard";
import { getApiErrorMessage } from "../api/client";

function toChartData(record: Record<string, number> | undefined) {
  return Object.entries(record ?? {}).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }));
}

export function DashboardPage() {
  const { data: summary, isLoading: loadingSummary, error: summaryError } = useDashboardSummary();
  const { data: analytics, isLoading: loadingAnalytics } = useDashboardAnalytics();

  return (
    <div className="mx-auto mt-8 max-w-6xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Dashboard</h1>

      {summaryError && <p className="text-sm text-red-600">{getApiErrorMessage(summaryError)}</p>}
      {loadingSummary && <p className="text-sm text-slate-500">Loading…</p>}

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total" value={summary.total} />
          <StatCard label="Open" value={summary.open} />
          <StatCard label="In Progress" value={summary.inProgress} />
          <StatCard label="Resolved" value={summary.resolved} />
          <StatCard label="Critical" value={summary.critical} tone="warning" />
          <StatCard label="SLA Breaches" value={summary.slaBreaches} tone="danger" />
          <StatCard label="Avg. Resolution" value={`${Math.round(summary.avgResolutionMinutes / 60)}h`} />
        </div>
      )}

      {!loadingAnalytics && analytics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BarChartCard title="Tickets by Status" data={toChartData(analytics.byStatus)} color="#2563eb" />
          <BarChartCard title="Tickets by Priority" data={toChartData(analytics.byPriority)} color="#f97316" />
          <BarChartCard title="Tickets by Category" data={toChartData(analytics.byCategory)} color="#059669" />
          <BarChartCard
            title="Tickets by Agent"
            data={analytics.byAgent.map((a) => ({ name: a.name, count: a.count }))}
            color="#7c3aed"
          />
        </div>
      )}
    </div>
  );
}
