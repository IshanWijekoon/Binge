import type { TVEpisode, TVScheduleOptions, TVSearchResult, TVSeason, TVShow } from "../../../domain/types";
import { AppError } from "../../../shared/errors";
import { TVmazeClient } from "./tvmaze-client";
import {
  mapEpisode,
  mapSearchResult,
  mapSeason,
  mapShow,
  scheduleCacheKey,
  toTvmazeEpisodeId,
  toTvmazeShowId,
} from "./tvmaze-mapper";
import type { TVProvider } from "./tv-provider";

type TVmazeObject = Record<string, unknown>;

export class TVmazeProvider implements TVProvider {
  private readonly client: TVmazeClient;

  constructor(
    env: Env,
    private readonly cache: KVNamespace,
  ) {
    this.client = new TVmazeClient(env);
  }

  searchShows(query: string): Promise<TVSearchResult[]> {
    return this.cached(`tv:search:v1:${query.toLowerCase()}`, 60 * 60 * 6, async () => {
      const response = await this.client.get<TVmazeObject[]>(`/search/shows?q=${encodeURIComponent(query)}`);
      return response.map(mapSearchResult).filter((item): item is TVSearchResult => item !== null);
    });
  }

  getShow(showId: string): Promise<TVShow> {
    const providerId = toTvmazeShowId(showId);
    return this.cached(`tv:show:v1:${providerId}`, 60 * 60 * 12, async () => {
      const response = await this.client.get<TVmazeObject>(`/shows/${providerId}`);
      return mapShow(response);
    });
  }

  getSeasons(showId: string): Promise<TVSeason[]> {
    const providerId = toTvmazeShowId(showId);
    return this.cached(`tv:show-seasons:v1:${providerId}`, 60 * 60 * 24, async () => {
      const response = await this.client.get<TVmazeObject[]>(`/shows/${providerId}/seasons`);
      return response.map((season) => mapSeason(season, `tvmaze:show:${providerId}`));
    });
  }

  getEpisodes(showId: string, options: { includeSpecials?: boolean } = {}): Promise<TVEpisode[]> {
    const providerId = toTvmazeShowId(showId);
    const specials = options.includeSpecials ? 1 : 0;
    return this.cached(`tv:show-episodes:v1:${providerId}:specials:${specials}`, 60 * 60 * 6, async () => {
      const response = await this.client.get<TVmazeObject[]>(`/shows/${providerId}/episodes${specials ? "?specials=1" : ""}`);
      return response.map((episode) => mapEpisode(episode, `tvmaze:show:${providerId}`));
    });
  }

  getEpisode(episodeId: string): Promise<TVEpisode> {
    const providerId = toTvmazeEpisodeId(episodeId);
    return this.cached(`tv:episode:v1:${providerId}`, 60 * 60 * 12, async () => {
      const response = await this.client.get<TVmazeObject>(`/episodes/${providerId}?embed=show`);
      return mapEpisode(response);
    });
  }

  getSchedule(options: TVScheduleOptions): Promise<TVEpisode[]> {
    const params = new URLSearchParams();
    if (options.country !== undefined) params.set("country", options.country);
    if (options.date) params.set("date", options.date);
    const path = `${options.web ? "/schedule/web" : "/schedule"}${params.size ? `?${params.toString()}` : ""}`;
    return this.cached(scheduleCacheKey("tv:schedule:v1", options), 60 * 45, async () => {
      const response = await this.client.get<TVmazeObject[]>(path);
      return response.map((episode) => mapEpisode(episode));
    });
  }

  getFullSchedule(): Promise<TVEpisode[]> {
    return this.cached("tv:full-schedule:v1", 60 * 60 * 24, async () => {
      const response = await this.client.get<TVmazeObject[]>("/schedule/full");
      return response.map((episode) => mapEpisode(episode));
    });
  }

  private async cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key, "json");
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await load();
      await this.cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
      return value;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(502, "TV_PROVIDER_BAD_RESPONSE", "TV metadata provider returned an invalid response");
    }
  }
}
