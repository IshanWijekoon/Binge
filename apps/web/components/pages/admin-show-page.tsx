"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type JournalShowStatus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { statusLabel } from "@/lib/format";
import { adminBasePath } from "@/lib/admin-path";
import { AdminShell } from "@/components/layout/app-shell";
import { EpisodeRow, SeasonTabs } from "@/components/journal/episode-row";
import { EmptyState, ShowProgress } from "@/components/journal/shared";
import { ShowPoster } from "@/components/journal/show-poster";
import { useEpisodeMutations } from "@/lib/hooks/use-episode-mutations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLoginPage } from "./admin-dashboard-page";
import { useAdminSession } from "@/lib/hooks/use-admin-session";

const statuses: JournalShowStatus[] = ["watching", "completed", "plan-to-watch", "on-hold", "dropped"];

function AdminShowContent() {
  const params = useSearchParams();
  const showId = params.get("id");
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toggleEpisode, markSeasonWatched, isPending } = useEpisodeMutations();

  const { data: showData, isLoading } = useQuery({
    queryKey: queryKeys.show(showId ?? ""),
    queryFn: () => api.adminShow(showId!).then((r) => r.show),
    enabled: Boolean(showId),
  });

  const { data: episodesData, isLoading: episodesLoading } = useQuery({
    queryKey: queryKeys.episodes(showData?.providerShowId ?? ""),
    queryFn: () => api.getEpisodes(showData!.providerShowId).then((r) => r.episodes),
    enabled: Boolean(showData?.providerShowId),
  });

  const updateStatus = useMutation({
    mutationFn: (status: JournalShowStatus) => api.adminUpdateShow(showId!, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.show(showId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const refresh = useMutation({
    mutationFn: () => api.adminRefreshShow(showId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.show(showId!) });
      toast.success("Metadata refreshed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: () => api.adminDeleteShow(showId!),
    onSuccess: () => {
      toast.success("Show removed");
      window.location.href = adminBasePath();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seasons = useMemo(() => [...new Set((episodesData ?? []).map((ep) => ep.season ?? 1))].sort((a, b) => a - b), [episodesData]);
  const active = activeSeason ?? seasons[0] ?? 1;
  const watchedIds = useMemo(() => new Set(showData?.episodes.map((e) => e.providerEpisodeId) ?? []), [showData?.episodes]);
  const seasonEpisodes = (episodesData ?? []).filter((ep) => (ep.season ?? 1) === active).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  if (!showId) return <EmptyState title="No show selected" />;
  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!showData) return <EmptyState title="Show not found" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 pb-6 md:px-8 md:py-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button asChild variant="secondary" size="sm">
          <Link href={adminBasePath() as "/"}><ArrowLeft className="size-4" /> Library</Link>
        </Button>
      </div>

      <div className="card-glow grid gap-6 rounded-2xl border bg-card p-4 md:p-6 lg:grid-cols-[160px_1fr]">
        <ShowPoster src={showData.imageSnapshot} alt={showData.showNameSnapshot} className="mx-auto aspect-[2/3] w-full max-w-[160px] lg:mx-0" />
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold md:text-3xl">{showData.showNameSnapshot}</h1>
              <p className="text-sm text-muted-foreground">{statusLabel(showData.status)}</p>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {statuses.map((s) => (
                <Button key={s} size="sm" className="shrink-0" variant={showData.status === s ? "default" : "secondary"} onClick={() => updateStatus.mutate(s)} disabled={updateStatus.isPending}>
                  {statusLabel(s)}
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">Overall progress</p>
            <p className="text-lg font-semibold">
              {showData.episodesWatched ?? 0} / {showData.totalEpisodes ?? 0} episodes · {showData.progressPercent ?? 0}%
            </p>
            <p className="text-sm text-muted-foreground">{showData.episodesRemaining ?? 0} remaining</p>
            <ShowProgress show={showData} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Episodes</h2>
        {episodesLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : (
          <>
            <SeasonTabs seasons={seasons} activeSeason={active} onChange={setActiveSeason} />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                size="sm"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={isPending || markSeasonWatched.isPending}
                onClick={() => markSeasonWatched.mutate({ showId: showId!, season: active })}
              >
                Mark season {active} watched
              </Button>
            </div>
            <div className="space-y-3">
              {seasonEpisodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  watched={watchedIds.has(episode.id)}
                  editable
                  disabled={isPending}
                  onToggle={toggleEpisode}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function AdminShowPage() {
  const { data: session, isLoading } = useAdminSession();
  if (isLoading) return <Skeleton className="m-8 h-64 rounded-2xl" />;
  if (!session) return <AdminLoginPage />;

  return (
    <AdminShell>
      <Suspense fallback={<Skeleton className="m-8 h-96 rounded-2xl" />}>
        <AdminShowContent />
      </Suspense>
    </AdminShell>
  );
}
