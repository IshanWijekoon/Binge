"use client";

import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JournalShowSummary } from "@/lib/api";
import { episodeCode, showPath, statusLabel } from "@/lib/format";
import { ShowProgress } from "./shared";
import { ShowPoster } from "./show-poster";

export function ContinueWatchingCard({ show, priority = false }: { show: JournalShowSummary; priority?: boolean }) {
  return (
    <article className="group card-glow w-[220px] shrink-0 overflow-hidden rounded-2xl border bg-card transition-all duration-300 md:w-[260px]">
      <Link href={showPath(show.id)} className="block">
        <ShowPoster src={show.imageSnapshot} alt={show.showNameSnapshot} className="aspect-[2/3] w-full" priority={priority} />
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <Link href={showPath(show.id)} className="line-clamp-1 font-semibold transition-colors hover:text-primary">
            {show.showNameSnapshot}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {statusLabel(show.status)} · {episodeCode(show.currentSeason, show.currentEpisode)}
          </p>
        </div>
        <ShowProgress show={show} />
        {show.nextEpisode ? (
          <p className="text-xs text-muted-foreground">
            Up next: {episodeCode(show.nextEpisode.season, show.nextEpisode.number)}
          </p>
        ) : null}
        <Button asChild size="sm" className="w-full">
          <Link href={showPath(show.id)}>
            <Play className="size-3.5" />
            Open
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function LibraryShowCard({ show }: { show: JournalShowSummary }) {
  return (
    <article className="group card-glow overflow-hidden rounded-2xl border bg-card transition-all duration-300">
      <div className="grid gap-4 p-4 md:grid-cols-[140px_1fr]">
        <Link href={showPath(show.id)}>
          <ShowPoster src={show.imageSnapshot} alt={show.showNameSnapshot} className="aspect-[2/3] w-full md:w-[140px]" />
        </Link>
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div className="space-y-2">
            <Link href={showPath(show.id)} className="text-lg font-semibold transition-colors hover:text-primary">
              {show.showNameSnapshot}
            </Link>
            <p className="text-sm text-muted-foreground">
              {[show.yearSnapshot, show.networkSnapshot, ...(show.genresSnapshot?.slice(0, 2) ?? [])].filter(Boolean).join(" · ")}
            </p>
            <ShowProgress show={show} />
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={showPath(show.id)}>
              View
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
