import type { TVEpisode, TVImage, TVScheduleOptions, TVSearchResult, TVSeason, TVShow } from "../../../domain/types";

type TVmazeObject = Record<string, unknown>;

export const toTvmazeShowId = (showId: string): number => parseProviderId(showId, "show");
export const toTvmazeEpisodeId = (episodeId: string): number => parseProviderId(episodeId, "episode");
export const toShowId = (providerId: number): string => `tvmaze:show:${providerId}`;
export const toEpisodeId = (providerId: number): string => `tvmaze:episode:${providerId}`;
export const toSeasonId = (providerId: number): string => `tvmaze:season:${providerId}`;

export function mapSearchResult(raw: TVmazeObject): TVSearchResult | null {
  const show = object(raw.show);
  if (!show) return null;
  return {
    score: number(raw.score) ?? 0,
    show: mapShow(show),
  };
}

export function mapShow(raw: TVmazeObject): TVShow {
  const id = requiredNumber(raw.id, "show.id");
  const schedule = object(raw.schedule);
  const network = object(raw.network);
  const webChannel = object(raw.webChannel);

  return {
    id: toShowId(id),
    provider: "tvmaze",
    providerId: id,
    name: requiredString(raw.name, "show.name"),
    summary: text(raw.summary),
    status: text(raw.status),
    premiered: text(raw.premiered),
    ended: text(raw.ended),
    image: image(raw.image),
    genres: arrayOfStrings(raw.genres),
    runtime: number(raw.runtime),
    averageRuntime: number(raw.averageRuntime),
    schedule: {
      time: schedule ? text(schedule.time) : null,
      days: schedule ? arrayOfStrings(schedule.days) : [],
    },
    network: network ? text(network.name) : null,
    webChannel: webChannel ? text(webChannel.name) : null,
    officialSite: text(raw.officialSite),
  };
}

export function mapSeason(raw: TVmazeObject, showId: string): TVSeason {
  const id = requiredNumber(raw.id, "season.id");
  return {
    id: toSeasonId(id),
    provider: "tvmaze",
    providerId: id,
    showId,
    number: number(raw.number) ?? 0,
    name: text(raw.name),
    episodeOrder: number(raw.episodeOrder),
    premiereDate: text(raw.premiereDate),
    endDate: text(raw.endDate),
    image: image(raw.image),
  };
}

export function mapEpisode(raw: TVmazeObject, fallbackShowId: string | null = null): TVEpisode {
  const id = requiredNumber(raw.id, "episode.id");
  const embedded = object(raw._embedded);
  const embeddedShow = embedded ? object(embedded.show) : null;
  const directShow = object(raw.show);
  const mappedShow = embeddedShow ? mapShow(embeddedShow) : directShow ? mapShow(directShow) : undefined;

  return {
    id: toEpisodeId(id),
    provider: "tvmaze",
    providerId: id,
    showId: mappedShow?.id ?? fallbackShowId,
    season: number(raw.season),
    number: number(raw.number),
    name: requiredString(raw.name, "episode.name"),
    summary: text(raw.summary),
    airdate: text(raw.airdate),
    airtime: text(raw.airtime),
    airstamp: text(raw.airstamp),
    runtime: number(raw.runtime),
    image: image(raw.image),
    ...(mappedShow ? { show: mappedShow } : {}),
  };
}

export function scheduleCacheKey(prefix: string, options: TVScheduleOptions): string {
  return `${prefix}:${options.web ? "web" : "broadcast"}:${options.country ?? "US"}:${options.date ?? "today"}`;
}

function parseProviderId(value: string, type: "show" | "episode"): number {
  const prefix = `tvmaze:${type}:`;
  const raw = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${type} id`);
  }
  return parsed;
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = number(value);
  if (parsed === null) {
    throw new Error(`TVmaze response missing ${field}`);
  }
  return parsed;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TVmaze response missing ${field}`);
  }
  return value;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? stripHtml(value) : null;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function object(value: unknown): TVmazeObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as TVmazeObject) : null;
}

function image(value: unknown): TVImage | null {
  const raw = object(value);
  if (!raw) return null;
  return {
    medium: text(raw.medium),
    original: text(raw.original),
  };
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
