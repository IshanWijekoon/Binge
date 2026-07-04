import type { TVEpisode, TVScheduleOptions, TVSearchResult, TVSeason, TVShow } from "../../../domain/types";

export interface TVProvider {
  searchShows(query: string): Promise<TVSearchResult[]>;
  getShow(showId: string): Promise<TVShow>;
  getSeasons(showId: string): Promise<TVSeason[]>;
  getEpisodes(showId: string, options?: { includeSpecials?: boolean }): Promise<TVEpisode[]>;
  getEpisode(episodeId: string): Promise<TVEpisode>;
  getSchedule(options: TVScheduleOptions): Promise<TVEpisode[]>;
  getFullSchedule(): Promise<TVEpisode[]>;
}
