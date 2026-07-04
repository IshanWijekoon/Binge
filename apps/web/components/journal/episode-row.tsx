"use client";

import Image from "next/image";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { TVEpisode } from "@/lib/api";
import { episodeCode, formatDate, formatRuntime, stripHtml } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SeasonTabs({
  seasons,
  activeSeason,
  onChange,
}: {
  seasons: number[];
  activeSeason: number;
  onChange: (season: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {seasons.map((season) => (
        <button
          key={season}
          role="tab"
          aria-selected={activeSeason === season}
          onClick={() => onChange(season)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            activeSeason === season ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          Season {season}
        </button>
      ))}
    </div>
  );
}

export function EpisodeRow({
  episode,
  watched,
  editable = false,
  onToggle,
  disabled = false,
}: {
  episode: TVEpisode;
  watched: boolean;
  editable?: boolean;
  onToggle?: (episodeId: string, watched: boolean) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const summary = stripHtml(episode.summary);

  return (
    <div className={cn("card-glow rounded-2xl border bg-card p-4 transition-all", watched && "border-success/20 bg-success/5")}>
      <div className="flex gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          {episode.image?.medium ? (
            <Image src={episode.image.medium} alt={episode.name} fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{episodeCode(episode.season, episode.number)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-primary">{episodeCode(episode.season, episode.number)}</p>
              <h3 className="font-semibold">{episode.name}</h3>
              <p className="text-xs text-muted-foreground">
                {formatRuntime(episode.runtime)} · {formatDate(episode.airdate)}
              </p>
            </div>
            {editable ? (
              <Checkbox checked={watched} disabled={disabled} onCheckedChange={() => onToggle?.(episode.id, watched)} aria-label={`Mark ${episode.name} as watched`} />
            ) : (
              <div className={cn("grid size-5 place-items-center rounded-md border", watched ? "border-success bg-success text-success-foreground" : "border-border text-transparent")}>
                {watched ? "✓" : ""}
              </div>
            )}
          </div>
          {summary ? (
            <button type="button" onClick={() => setExpanded((value) => !value)} className="text-left text-sm text-muted-foreground hover:text-foreground">
              {expanded ? summary : `${summary.slice(0, 120)}${summary.length > 120 ? "…" : ""}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
