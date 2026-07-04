"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { episodeCode, groupCalendarByDate } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/journal/shared";
import { Skeleton } from "@/components/ui/skeleton";

export function CalendarPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.calendar,
    queryFn: () => api.publicCalendar().then((r) => r.entries),
  });

  const groups = groupCalendarByDate(data ?? []);

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Calendar" title="Upcoming episodes" description="Grouped by air date for shows you're actively watching." />

      {error ? <EmptyState title="Failed to load calendar" description={error.message} /> : null}
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : groups.length ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-4 text-lg font-semibold text-primary">{group.label}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.entries.map((entry) => (
                  <div key={entry.episode.id} className="card-glow rounded-2xl border bg-card p-5">
                    <p className="font-semibold">{entry.show.showNameSnapshot}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {episodeCode(entry.episode.season, entry.episode.number)} · {entry.episode.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No upcoming episodes" description="When shows you're watching have scheduled air dates, they'll appear here grouped by day." />
      )}
    </div>
  );
}
