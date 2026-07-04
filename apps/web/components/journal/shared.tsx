import { Progress } from "@/components/ui/progress";
import type { JournalShowSummary } from "@/lib/api";
import { episodeCode, statusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return <Progress value={value} className={className} />;
}

export function ShowProgress({ show }: { show: JournalShowSummary }) {
  const percent = show.progressPercent ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {show.episodesWatched ?? 0} / {show.totalEpisodes ?? 0} episodes
        </span>
        <span>{percent}%</span>
      </div>
      <ProgressBar value={percent} />
      {typeof show.episodesRemaining === "number" ? (
        <p className="text-xs text-muted-foreground">{show.episodesRemaining} remaining</p>
      ) : null}
    </div>
  );
}

export function ShowMetaBadges({ show }: { show: JournalShowSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">{statusLabel(show.status)}</Badge>
      {show.yearSnapshot ? <Badge variant="outline">{show.yearSnapshot}</Badge> : null}
      {show.networkSnapshot ? <Badge variant="outline">{show.networkSnapshot}</Badge> : null}
      {show.latestRating ? <Badge variant="warning">{show.latestRating}/10</Badge> : null}
    </div>
  );
}

export function NextEpisodeLabel({ show }: { show: JournalShowSummary }) {
  if (!show.nextEpisode) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Next: {episodeCode(show.nextEpisode.season, show.nextEpisode.number)}
      {show.nextEpisode.name ? ` · ${show.nextEpisode.name}` : ""}
    </p>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-8 animate-fade-in">
      {eyebrow ? <p className="text-sm font-medium text-primary">{eyebrow}</p> : null}
      <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/40 px-8 py-12 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
