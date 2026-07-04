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
  selectedSeasons,
  onToggleSeasonSelect,
}: {
  seasons: number[];
  activeSeason: number;
  onChange: (season: number) => void;
  selectedSeasons?: Set<number>;
  onToggleSeasonSelect?: (season: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {seasons.map((season) => {
        const isActive = activeSeason === season;
        const isSelected = selectedSeasons?.has(season) ?? false;

        return (
          <div
            key={season}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-2 transition-all",
              isActive ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40",
              isSelected && "ring-2 ring-primary/60",
            )}
          >
            {onToggleSeasonSelect ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSeasonSelect(season)}
                aria-label={`Select season ${season} for bulk mark watched`}
              />
            ) : null}
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(season)}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Season {season}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function EpisodeRow({
  episode,
  watched,
  editable = false,
  onToggle,
  disabled = false,
  selectable = false,
  selected = false,
  onSelectChange,
}: {
  episode: TVEpisode;
  watched: boolean;
  editable?: boolean;
  onToggle?: (episodeId: string, watched: boolean) => void;
  disabled?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (episodeId: string, selected: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const summary = stripHtml(episode.summary);

  return (
    <div className={cn("card-glow rounded-2xl border bg-card p-4 transition-all", watched && "border-success/20 bg-success/5", selected && !watched && "ring-2 ring-primary/40")}>
      <div className="flex gap-4">
        {selectable && !watched ? (
          <div className="flex shrink-0 items-start pt-1">
            <Checkbox
              checked={selected}
              disabled={disabled}
              onCheckedChange={() => onSelectChange?.(episode.id, selected)}
              aria-label={`Select ${episode.name} for bulk mark watched`}
            />
          </div>
        ) : null}
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
