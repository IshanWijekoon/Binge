"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { episodeCode, statusLabel, stripHtml } from "@/lib/format";
import { EpisodeRow, SeasonTabs } from "@/components/journal/episode-row";
import { EmptyState, PageHeader, ShowMetaBadges, ShowProgress } from "@/components/journal/shared";
import { ShowPoster } from "@/components/journal/show-poster";
import { Skeleton } from "@/components/ui/skeleton";

function ShowPageContent() {
  const params = useSearchParams();
  const showId = params.get("id");
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  const { data: showData, isLoading: showLoading } = useQuery({
    queryKey: queryKeys.show(showId ?? ""),
    queryFn: () => api.publicShow(showId!).then((r) => r.show),
    enabled: Boolean(showId),
  });

  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: queryKeys.episodes(showData?.providerShowId ?? ""),
    queryFn: () => api.getEpisodes(showData!.providerShowId).then((r) => r.episodes),
    enabled: Boolean(showData?.providerShowId),
  });

  const seasons = useMemo(() => {
    const nums = new Set((episodesData ?? []).map((ep) => ep.season ?? 1));
    return [...nums].sort((a, b) => a - b);
  }, [episodesData]);

  const active = activeSeason ?? seasons[0] ?? 1;
  const watchedIds = useMemo(() => new Set(showData?.episodes.map((e) => e.providerEpisodeId) ?? []), [showData?.episodes]);
  const seasonEpisodes = (episodesData ?? []).filter((ep) => (ep.season ?? 1) === active).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  if (!showId) return <EmptyState title="No show selected" description="Open a show from your library." />;

  if (showLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!showData) return <EmptyState title="Show not found" />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <ShowPoster src={showData.imageSnapshot} alt={showData.showNameSnapshot} className="aspect-[2/3] w-full max-w-[280px]" priority />
        <div className="space-y-4">
          <PageHeader title={showData.showNameSnapshot} description={stripHtml(showData.summarySnapshot)} />
          <ShowMetaBadges show={showData} />
          <ShowProgress show={showData} />
          {showData.rating ? <p className="text-sm">Rating: <span className="font-semibold text-warning">{showData.rating.rating}/10</span></p> : null}
          {showData.review?.body ? (
            <div className="rounded-2xl border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-primary">Review</p>
              <p className="text-sm text-muted-foreground">{showData.review.body}</p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Episodes · {statusLabel(showData.status)}</h2>
        {episodesLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : (
          <>
            <SeasonTabs seasons={seasons} activeSeason={active} onChange={setActiveSeason} />
            <div className="space-y-3">
              {seasonEpisodes.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} watched={watchedIds.has(episode.id)} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function ShowPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <ShowPageContent />
    </Suspense>
  );
}
