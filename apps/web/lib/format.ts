import type { CalendarEntry, JournalShowStatus } from "./api";

export function statusLabel(status: JournalShowStatus): string {
  switch (status) {
    case "watching":
      return "Watching";
    case "completed":
      return "Completed";
    case "plan-to-watch":
      return "Plan To Watch";
    case "on-hold":
      return "On Hold";
    case "dropped":
      return "Dropped";
  }
}

export function episodeCode(season: number | null | undefined, number: number | null | undefined): string {
  return `S${String(season ?? 0).padStart(2, "0")}E${String(number ?? 0).padStart(2, "0")}`;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat(undefined, options ?? { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return "TBD";
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(value, { month: "long", day: "numeric" });
}

export function groupCalendarByDate(entries: CalendarEntry[]): Array<{ label: string; entries: CalendarEntry[] }> {
  const groups = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const label = formatRelativeDate(entry.episode.airstamp ?? entry.episode.airdate);
    const bucket = groups.get(label) ?? [];
    bucket.push(entry);
    groups.set(label, bucket);
  }
  return [...groups.entries()].map(([label, groupEntries]) => ({ label, entries: groupEntries }));
}

export function showPath(id: string): `/show?id=${string}` {
  return `/show?id=${encodeURIComponent(id)}`;
}
