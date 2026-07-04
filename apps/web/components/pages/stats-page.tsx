"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, EmptyState } from "@/components/journal/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalBarChart, MonthlyBarChart, StatusDonut, TrendLineChart } from "@/components/charts/stats-charts";

export function StatsPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.publicStats().then((r) => r.stats),
  });

  if (error) return <EmptyState title="Failed to load statistics" description={error.message} />;
  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader eyebrow="Statistics" title="Your watching journey" description="Shows completed, episodes watched, genres, networks, and trends." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed" value={stats.completed_shows} />
        <StatCard label="Episodes watched" value={stats.episodes_watched} />
        <StatCard label="Hours watched" value={stats.hours_watched ?? 0} suffix="h" />
        <StatCard label="Average rating" value={stats.average_rating ? stats.average_rating.toFixed(1) : "—"} />
        <StatCard label="Shows added this year" value={stats.shows_added_this_year ?? 0} />
        <StatCard label="Watching now" value={stats.watching_shows} />
        <StatCard label="Reviews" value={stats.reviews_written} />
        <StatCard label="Ratings" value={stats.ratings_given} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Shows by status">
          <StatusDonut stats={stats} />
        </ChartCard>
        <ChartCard title="Monthly episodes watched">
          <MonthlyBarChart data={stats.monthly_episodes_watched ?? []} />
        </ChartCard>
        <ChartCard title="Top genres">
          <HorizontalBarChart data={stats.top_genres ?? []} />
        </ChartCard>
        <ChartCard title="Top networks">
          <HorizontalBarChart data={stats.top_networks ?? []} />
        </ChartCard>
        <ChartCard title="Watching trend" className="lg:col-span-2">
          <TrendLineChart data={stats.watching_trend ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="card-glow rounded-2xl border bg-card p-5">
      <p className="text-3xl font-bold">{value}{suffix && typeof value === "number" ? suffix : ""}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-glow rounded-2xl border bg-card p-5 ${className ?? ""}`}>
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
