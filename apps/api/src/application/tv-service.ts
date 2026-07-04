import type { TVEpisode, TVScheduleOptions, TVSearchResult, TVSeason, TVShow } from "../domain/types";
import { badRequest } from "../shared/errors";
import { EpisodeWatchHistoryRepository, FollowedShowRepository } from "../infrastructure/repositories/tv-user-state";
import type { TVProvider } from "../infrastructure/providers/tv/tv-provider";

export class TVService {
  constructor(
    private readonly provider: TVProvider,
    private readonly followedShows: FollowedShowRepository,
    private readonly watchHistory: EpisodeWatchHistoryRepository,
  ) {}

  searchShows(query: string): Promise<TVSearchResult[]> {
    return this.provider.searchShows(query);
  }

  getShow(showId: string): Promise<TVShow> {
    return this.provider.getShow(showId);
  }

  getSeasons(showId: string): Promise<TVSeason[]> {
    return this.provider.getSeasons(showId);
  }

  getEpisodes(showId: string, options?: { includeSpecials?: boolean }): Promise<TVEpisode[]> {
    return this.provider.getEpisodes(showId, options);
  }

  getEpisode(episodeId: string): Promise<TVEpisode> {
    return this.provider.getEpisode(episodeId);
  }

  getSchedule(options: TVScheduleOptions): Promise<TVEpisode[]> {
    return this.provider.getSchedule(options);
  }

  async getTodaySchedule(options: Omit<TVScheduleOptions, "date"> = {}): Promise<TVEpisode[]> {
    return this.provider.getSchedule(options);
  }

  async getUpcomingEpisodes(userId: string): Promise<TVEpisode[]> {
    const followed = await this.followedShows.list(userId);
    const followedIds = new Set(followed.map((row) => String(row.provider_show_id)));
    if (followedIds.size === 0) {
      return [];
    }

    const now = Date.now();
    const episodesByShow = await Promise.allSettled([...followedIds].map((showId) => this.provider.getEpisodes(showId)));
    return episodesByShow
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .filter((episode) => episode.airstamp && Date.parse(episode.airstamp) >= now)
      .sort((left, right) => Date.parse(left.airstamp ?? "") - Date.parse(right.airstamp ?? ""))
      .slice(0, 100);
  }

  async getRecentlyAiredEpisodes(userId: string): Promise<TVEpisode[]> {
    const followed = await this.followedShows.list(userId);
    const followedIds = new Set(followed.map((row) => String(row.provider_show_id)));
    if (followedIds.size === 0) {
      return [];
    }

    const now = Date.now();
    const episodesByShow = await Promise.allSettled([...followedIds].map((showId) => this.provider.getEpisodes(showId)));
    return episodesByShow
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .filter((episode) => episode.airstamp && Date.parse(episode.airstamp) <= now)
      .sort((left, right) => Date.parse(right.airstamp ?? "") - Date.parse(left.airstamp ?? ""))
      .slice(0, 100);
  }

  async followShow(userId: string, showId: string) {
    const show = await this.provider.getShow(showId);
    return this.followedShows.follow(userId, show);
  }

  unfollowShow(userId: string, showId: string): Promise<void> {
    return this.followedShows.unfollow(userId, showId);
  }

  listFollowedShows(userId: string) {
    return this.followedShows.list(userId);
  }

  async markEpisodeWatched(userId: string, episodeId: string) {
    const episode = await this.provider.getEpisode(episodeId);
    if (!episode.showId && !episode.show) {
      throw badRequest("Episode is missing show metadata");
    }
    return this.watchHistory.markWatched(userId, episode);
  }

  unmarkEpisodeWatched(userId: string, episodeId: string): Promise<void> {
    return this.watchHistory.delete(userId, episodeId);
  }

  listWatchHistory(userId: string) {
    return this.watchHistory.list(userId);
  }

  stats(userId: string) {
    return this.watchHistory.stats(userId);
  }
}
