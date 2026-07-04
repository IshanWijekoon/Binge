"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { episodeCode, formatRelativeDate, groupCalendarByDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ContinueWatchingCard } from "@/components/journal/show-cards";
import { EmptyState, PageHeader } from "@/components/journal/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShowPoster } from "@/components/journal/show-poster";
import { showPath } from "@/lib/format";

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.feed,
    queryFn: () => api.publicFeed().then((r) => r.feed),
  });

  if (error) {
    return <EmptyState title="Failed to load journal" description={error instanceof Error ? error.message : "Unknown error"} />;
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Your TV Journal" title="What should you watch next?" description="Continue where you left off, see what's airing soon, and track your progress." />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Continue Watching</h2>
        </div>
        {isLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] w-[260px] shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : data?.continueWatching.length ? (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {data.continueWatching.map((show, index) => (
              <ContinueWatchingCard key={show.id} show={show} priority={index < 2} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing in progress" description="Add shows to your journal and mark them as watching." />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Upcoming Episodes</h2>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : data?.upcomingEpisodes.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcomingEpisodes.map((entry) => (
              <div key={entry.episode.id} className="card-glow flex items-center justify-between rounded-2xl border bg-card p-4">
                <div>
                  <p className="font-medium">{entry.show.showNameSnapshot}</p>
                  <p className="text-sm text-muted-foreground">
                    {episodeCode(entry.episode.season, entry.episode.number)} · {entry.episode.name}
                  </p>
                </div>
                <p className="text-sm text-primary">{formatRelativeDate(entry.episode.airstamp)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming episodes" description="Shows you're watching don't have scheduled air dates yet." />
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Recently Added" items={data?.recentlyAdded} loading={isLoading} />
        <Section title="Recently Finished" items={data?.recentlyFinished} loading={isLoading} />
      </div>

      <StatsPreview loading={isLoading} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : data?.recentActivity.length ? (
          <div className="space-y-3">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border bg-card p-3">
                <ShowPoster src={item.showImageSnapshot} alt={item.showNameSnapshot} className="size-12 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.showNameSnapshot}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {episodeCode(item.seasonNumberSnapshot, item.episodeNumberSnapshot)} · {item.episodeNameSnapshot}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No activity yet" />
        )}
      </section>

      <CalendarPreview loading={isLoading} entries={data?.upcomingEpisodes ?? []} />
    </div>
  );
}

function Section({ title, items, loading }: { title: string; items?: Array<{ id: string; showNameSnapshot: string; imageSnapshot: string | null; progressPercent?: number }>; loading: boolean }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />)}</div>
      ) : items?.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.slice(0, 6).map((show) => (
            <Link key={show.id} href={showPath(show.id)} className="group card-glow overflow-hidden rounded-2xl border bg-card">
              <ShowPoster src={show.imageSnapshot} alt={show.showNameSnapshot} className="aspect-[2/3]" />
              <p className="truncate p-3 text-sm font-medium">{show.showNameSnapshot}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()}`} />
      )}
    </section>
  );
}

function StatsPreview({ loading }: { loading: boolean }) {
  const { data: stats } = useQuery({ queryKey: queryKeys.stats, queryFn: () => api.publicStats().then((r) => r.stats) });

  return (
    <section className="card-glow rounded-2xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <Button asChild variant="secondary" size="sm">
          <Link href="/stats">View all <ArrowRight className="size-4" /></Link>
        </Button>
      </div>
      {loading || !stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Watching" value={stats.watching_shows} />
          <StatTile label="Completed" value={stats.completed_shows} />
          <StatTile label="Episodes" value={stats.episodes_watched} />
          <StatTile label="Hours" value={stats.hours_watched ?? 0} />
        </div>
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function CalendarPreview({ loading, entries }: { loading: boolean; entries: Array<{ show: { showNameSnapshot: string }; episode: { id: string; season: number | null; number: number | null; name: string; airstamp: string | null; airdate: string | null } }> }) {
  const groups = groupCalendarByDate(entries as never).slice(0, 4);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Calendar</h2>
        <Button asChild variant="secondary" size="sm">
          <Link href="/calendar"><CalendarDays className="size-4" /> Full calendar</Link>
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-sm font-medium text-primary">{group.label}</p>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <div key={entry.episode.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                    <span className="font-medium">{entry.show.showNameSnapshot}</span>
                    <span className="text-muted-foreground"> · {episodeCode(entry.episode.season, entry.episode.number)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Calendar is clear" description="No upcoming episodes from shows you're actively watching." />
      )}
    </section>
  );
}
