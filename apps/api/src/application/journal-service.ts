import type {
  ActivityEntry,
  CalendarEntry,
  JournalEpisodeEntry,
  JournalNoteEntry,
  JournalRatingEntry,
  JournalReviewEntry,
  JournalShowStatus,
  JournalShowSummary,
  JournalStats,
  ProgressSummary,
  PublicFeed,
  TVEpisode,
  TVSearchResult,
  TVShow,
} from "../domain/types";
import { badRequest, notFound } from "../shared/errors";
import type { TVProvider } from "../infrastructure/providers/tv/tv-provider";
import type { JournalRepository } from "../infrastructure/repositories/journal";

export interface PublicShowDetail extends JournalShowSummary {
  review: JournalReviewEntry | null;
  note: JournalNoteEntry | null;
  rating: JournalRatingEntry | null;
  episodes: JournalEpisodeEntry[];
}

export class JournalService {
  constructor(
    private readonly provider: TVProvider,
    private readonly journal: JournalRepository,
  ) {}

  searchShows(query: string): Promise<TVSearchResult[]> {
    return this.provider.searchShows(query);
  }

  listShows(): Promise<JournalShowSummary[]> {
    return this.enrichShowsLight(this.journal.listShows());
  }

  listShowsByStatus(status: JournalShowStatus): Promise<JournalShowSummary[]> {
    return this.enrichShowsLight(this.journal.listShowsByStatus(status));
  }

  async getShow(id: string): Promise<PublicShowDetail> {
    const show = await this.journal.getShow(id);
    if (!show) {
      throw notFound("Show not found");
    }

    const [reviews, notes, ratings, journalEpisodes] = await Promise.all([
      this.journal.listReviews(),
      this.journal.listNotes(),
      this.journal.listRatings(),
      this.journal.listEpisodesForShow(show.id),
    ]);

    const summary = this.toSummary(show);
    const progress = await this.computeProgress(
      show.id,
      show.provider_show_id,
      journalEpisodes,
      summary.currentSeason ?? 1,
      summary.currentEpisode ?? 0,
      summary.totalEpisodes ?? (show as any).total_episodes_snapshot ?? 0,
      true,
    );

    return {
      ...summary,
      ...progress,
      review: reviews.find((item) => item.journalShowId === show.id) ?? null,
      note: notes.find((item) => item.journalShowId === show.id) ?? null,
      rating: ratings.find((item) => item.journalShowId === show.id) ?? null,
      episodes: journalEpisodes,
    };
  }

  async getCalendar(): Promise<CalendarEntry[]> {
    const shows = await this.journal.listShows();
    const activeShows = shows.filter((show) => show.status === "watching").slice(0, 30);
    const entries: CalendarEntry[] = [];

    for (const show of activeShows) {
      try {
        const tvShow = await this.provider.getShow(show.providerShowId);
        const episodes = await this.provider.getEpisodes(show.providerShowId);
        for (const episode of episodes) {
          if (episode.airstamp && Date.parse(episode.airstamp) >= Date.now()) {
            entries.push({ show, episode: { ...episode, show: tvShow } });
          }
        }
      } catch {
        // Skip shows that fail provider lookup.
      }
    }

    return entries
      .sort((left, right) => Date.parse(left.episode.airstamp ?? "") - Date.parse(right.episode.airstamp ?? ""))
      .slice(0, 100);
  }

  async getFeed(): Promise<PublicFeed> {
    const [shows, activity] = await Promise.all([
      this.journal.listShows(),
      this.journal.listRecentActivity(15),
    ]);

    let calendar: CalendarEntry[] = [];
    try {
      calendar = await this.getCalendar();
    } catch {
      calendar = [];
    }

    const summaries = shows;

    const continueWatching = summaries
      .filter((show) => show.status === "watching")
      .sort((left, right) => Date.parse(right.progressUpdatedAt ?? right.updatedAt ?? "0") - Date.parse(left.progressUpdatedAt ?? left.updatedAt ?? "0"));

    const recentlyAdded = [...summaries]
      .sort((left, right) => Date.parse(right.createdAt ?? "0") - Date.parse(left.createdAt ?? "0"))
      .slice(0, 8);

    const recentlyFinished = summaries
      .filter((show) => show.status === "completed")
      .sort((left, right) => Date.parse(right.updatedAt ?? "0") - Date.parse(left.updatedAt ?? "0"))
      .slice(0, 8);

    const toEnrich = new Map<string, JournalShowSummary>();
    for (const show of [...continueWatching, ...recentlyAdded, ...recentlyFinished]) {
      toEnrich.set(show.id, show);
    }

    const enrichedMap = new Map(
      (await this.enrichShowsLight(Promise.resolve([...toEnrich.values()]))).map((show) => [show.id, show]),
    );

    const enrichList = (list: JournalShowSummary[]) => list.map((show) => enrichedMap.get(show.id) ?? show);

    return {
      continueWatching: enrichList(continueWatching),
      upcomingEpisodes: calendar.slice(0, 10),
      recentlyAdded: enrichList(recentlyAdded),
      recentlyFinished: enrichList(recentlyFinished),
      recentActivity: activity,
    };
  }

  getReviews(): Promise<JournalReviewEntry[]> {
    return this.journal.listReviews();
  }

  getStats(): Promise<JournalStats> {
    return this.computeStats();
  }

  private async computeStats(): Promise<JournalStats> {
    const base = await this.journal.stats();
    const extended = await this.journal.extendedStats();
    return { ...base, ...extended };
  }

  async addShow(showId: string, status: JournalShowStatus = "plan-to-watch"): Promise<JournalShowSummary> {
    const show = await this.provider.getShow(showId);
    const episodes = await this.provider.getEpisodes(show.id);
    const snapshots = this.episodeSnapshotsFromProvider(episodes);
    const existing = await this.journal.listShows();
    const sortOrder = existing.length;
    await this.journal.upsertShow({
      id: show.id,
      provider: show.provider,
      providerShowId: show.id,
      status,
      sortOrder,
      showNameSnapshot: show.name,
      summarySnapshot: show.summary,
      imageSnapshot: show.image?.medium ?? show.image?.original ?? null,
      premieredSnapshot: show.premiered,
      nextEpisodeAirDate: null,
      metadataRefreshedAt: new Date().toISOString(),
      ...this.metadataFromShow(show),
    });
    await this.journal.updateProgressSnapshots(show.id, snapshots.totalEpisodes, snapshots.totalRuntimeMinutes);
    return this.requireShowByProvider(show.id);
  }

  async updateShow(id: string, input: { status?: JournalShowStatus; sortOrder?: number; currentSeason?: number; currentEpisode?: number }): Promise<JournalShowSummary> {
    if (input.status === "completed") {
      await this.completeShow(id);
    }
    await this.journal.updateShow(id, input);
    const show = await this.journal.getShow(id);
    if (!show) {
      throw notFound("Show not found");
    }
    const enriched = await this.enrichShowsLight(Promise.resolve([this.toSummary(show)]));
    return enriched[0]!;
  }

  async deleteShow(id: string): Promise<void> {
    await this.journal.deleteShow(id);
  }

  async refreshShow(id: string): Promise<JournalShowSummary> {
    const current = await this.journal.getShow(id);
    if (!current) {
      throw notFound("Show not found");
    }

    const show = await this.provider.getShow(current.provider_show_id);
    const episodes = await this.provider.getEpisodes(show.id);
    const snapshots = this.episodeSnapshotsFromProvider(episodes);
    const nextEpisode = episodes.find((episode) => episode.airstamp && Date.parse(episode.airstamp) >= Date.now()) ?? null;

    await this.journal.refreshShow(id, {
      showNameSnapshot: show.name,
      summarySnapshot: show.summary,
      imageSnapshot: show.image?.medium ?? show.image?.original ?? null,
      premieredSnapshot: show.premiered,
      nextEpisodeAirDate: nextEpisode?.airdate ?? nextEpisode?.airstamp ?? null,
      metadataRefreshedAt: new Date().toISOString(),
      ...this.metadataFromShow(show),
      totalEpisodesSnapshot: snapshots.totalEpisodes,
      totalRuntimeMinutesSnapshot: snapshots.totalRuntimeMinutes,
    });

    const refreshed = await this.journal.getShow(id);
    if (!refreshed) {
      throw notFound("Show not found");
    }
    const enriched = await this.enrichShowsLight(Promise.resolve([this.toSummary(refreshed)]));
    return enriched[0]!;
  }

  async markEpisodeWatched(episodeId: string, progressSeconds = 0): Promise<PublicShowDetail> {
    const episode = await this.provider.getEpisode(episodeId);
    if (!episode.showId) {
      throw badRequest("Episode is missing show metadata");
    }

    const show = await this.provider.getShow(episode.showId);
    const journalShow = await this.journal.getShow(show.id);
    if (!journalShow) {
      throw notFound("Show not found in journal");
    }

    await this.journal.markEpisodeWatched({
      show,
      episode,
      progressSeconds,
      runtimeMinutes: episode.runtime ?? show.averageRuntime ?? show.runtime ?? null,
    });
    await this.syncShowProgressFromEpisodes(journalShow.id);
    return this.getShow(journalShow.id);
  }

  async unmarkEpisodeWatched(episodeId: string): Promise<PublicShowDetail> {
    const episode = await this.provider.getEpisode(episodeId);
    if (!episode.showId) {
      throw badRequest("Episode is missing show metadata");
    }

    const journalShow = await this.journal.getShow(episode.showId);
    if (!journalShow) {
      throw notFound("Show not found in journal");
    }

    await this.journal.deleteEpisodeByProviderId(episodeId);
    await this.syncShowProgressFromEpisodes(journalShow.id);
    return this.getShow(journalShow.id);
  }

  async markNextEpisode(showId: string): Promise<PublicShowDetail> {
    const journalShow = await this.journal.getShow(showId);
    if (!journalShow) {
      throw notFound("Show not found");
    }

    const providerEpisodes = await this.provider.getEpisodes(journalShow.provider_show_id);
    const watchedEpisodes = await this.journal.listEpisodesForShow(journalShow.id);
    const watchedIds = new Set(watchedEpisodes.map((entry) => entry.providerEpisodeId));

    const nextEpisode = providerEpisodes
      .filter((episode) => !watchedIds.has(episode.id))
      .sort((left, right) => {
        const leftSeason = left.season ?? 0;
        const rightSeason = right.season ?? 0;
        if (leftSeason !== rightSeason) return leftSeason - rightSeason;
        return (left.number ?? 0) - (right.number ?? 0);
      })[0];

    if (!nextEpisode) {
      throw badRequest("No unwatched episodes remaining");
    }

    return this.markEpisodeWatched(nextEpisode.id);
  }

  async markSeasonWatched(showId: string, season: number): Promise<PublicShowDetail> {
    return this.markSeasonsWatched(showId, [season]);
  }

  async markSeasonsWatched(showId: string, seasons: number[]): Promise<PublicShowDetail> {
    const uniqueSeasons = [...new Set(seasons)];
    if (!uniqueSeasons.length) {
      throw badRequest("At least one season is required");
    }

    const journalShow = await this.journal.getShow(showId);
    if (!journalShow) {
      throw notFound("Show not found");
    }

    const providerShow = await this.provider.getShow(journalShow.provider_show_id);
    const providerEpisodes = await this.provider.getEpisodes(journalShow.provider_show_id);

    for (const season of uniqueSeasons) {
      const seasonEpisodes = providerEpisodes.filter((episode) => (episode.season ?? 0) === season);
      if (!seasonEpisodes.length) {
        throw badRequest(`No episodes found for season ${season}`);
      }

      for (const episode of seasonEpisodes) {
        await this.journal.markEpisodeWatched({
          show: providerShow,
          episode,
          runtimeMinutes: episode.runtime ?? providerShow.averageRuntime ?? providerShow.runtime ?? null,
        });
      }
    }

    await this.syncShowProgressFromEpisodes(journalShow.id);
    return this.getShow(journalShow.id);
  }

  async markEpisodesWatched(episodeIds: string[]): Promise<PublicShowDetail> {
    const uniqueEpisodeIds = [...new Set(episodeIds)];
    if (!uniqueEpisodeIds.length) {
      throw badRequest("At least one episode is required");
    }

    let journalShowId: string | null = null;

    for (const episodeId of uniqueEpisodeIds) {
      const episode = await this.provider.getEpisode(episodeId);
      if (!episode.showId) {
        throw badRequest("Episode is missing show metadata");
      }

      const show = await this.provider.getShow(episode.showId);
      const journalShow = await this.journal.getShow(show.id);
      if (!journalShow) {
        throw notFound("Show not found in journal");
      }

      if (journalShowId && journalShowId !== journalShow.id) {
        throw badRequest("All episodes must belong to the same show");
      }
      journalShowId = journalShow.id;

      await this.journal.markEpisodeWatched({
        show,
        episode,
        runtimeMinutes: episode.runtime ?? show.averageRuntime ?? show.runtime ?? null,
      });
    }

    await this.syncShowProgressFromEpisodes(journalShowId!);
    return this.getShow(journalShowId!);
  }

  async upsertReview(showId: string, body: string, containsSpoilers = false): Promise<void> {
    const show = await this.requireProviderShow(showId);
    await this.journal.upsertReview({ show, body, containsSpoilers });
  }

  async upsertNote(showId: string, body: string): Promise<void> {
    const show = await this.requireProviderShow(showId);
    await this.journal.upsertNote({ show, body });
  }

  async upsertRating(showId: string, rating: number): Promise<void> {
    const show = await this.requireProviderShow(showId);
    await this.journal.upsertRating({ show, rating });
  }

  private async completeShow(id: string): Promise<void> {
    const journalShow = await this.journal.getShow(id);
    if (!journalShow) {
      throw notFound("Show not found");
    }

    const providerShow = await this.provider.getShow(journalShow.provider_show_id);
    const episodes = await this.provider.getEpisodes(journalShow.provider_show_id);
    const snapshots = this.episodeSnapshotsFromProvider(episodes);

    await this.journal.updateProgressSnapshots(id, snapshots.totalEpisodes, snapshots.totalRuntimeMinutes);

    for (const episode of episodes) {
      await this.journal.markEpisodeWatched({
        show: providerShow,
        episode,
        runtimeMinutes: episode.runtime ?? providerShow.averageRuntime ?? providerShow.runtime ?? null,
      });
    }

    if (episodes.length) {
      const last = [...episodes].sort((a, b) => {
        const aSeason = a.season ?? 0;
        const bSeason = b.season ?? 0;
        if (aSeason !== bSeason) return bSeason - aSeason;
        return (b.number ?? 0) - (a.number ?? 0);
      })[0]!;
      await this.journal.updateShow(id, {
        currentSeason: last.season ?? 1,
        currentEpisode: last.number ?? 0,
      });
    }
  }

  private async syncShowProgressFromEpisodes(journalShowId: string): Promise<void> {
    const episodes = await this.journal.listEpisodesForShow(journalShowId);
    if (!episodes.length) {
      await this.journal.updateShow(journalShowId, { currentSeason: 1, currentEpisode: 0 });
      return;
    }

    let maxSeason = 1;
    let maxEpisode = 0;
    for (const episode of episodes) {
      const season = episode.seasonNumberSnapshot ?? 0;
      const number = episode.episodeNumberSnapshot ?? 0;
      if (season > maxSeason || (season === maxSeason && number > maxEpisode)) {
        maxSeason = season;
        maxEpisode = number;
      }
    }

    await this.journal.updateShow(journalShowId, { currentSeason: maxSeason, currentEpisode: maxEpisode });
  }

  private computeProgressFromDb(
    show: JournalShowSummary,
    journalEpisodes: JournalEpisodeEntry[],
  ): ProgressSummary {
    const currentSeason = show.currentSeason ?? 1;
    const currentEpisode = show.currentEpisode ?? 0;
    const totalEpisodes = show.totalEpisodes ?? (show as any).total_episodes_snapshot ?? 0;
    let episodesWatched = journalEpisodes.length;

    if (show.status === "completed" && totalEpisodes > 0) {
      episodesWatched = totalEpisodes;
    } else if (journalEpisodes.length === 0 && (currentEpisode > 0 || currentSeason > 1)) {
      episodesWatched = Math.max(currentEpisode, (currentSeason - 1) * 10 + currentEpisode);
    }

    const episodesRemaining = totalEpisodes > 0 ? Math.max(0, totalEpisodes - episodesWatched) : 0;
    const progressPercent = totalEpisodes > 0 ? Math.round((episodesWatched / totalEpisodes) * 100) : 0;

    return {
      currentSeason,
      currentEpisode,
      episodesWatched,
      totalEpisodes,
      episodesRemaining,
      progressPercent,
      nextEpisode: null,
      nextEpisodeAirDate: show.nextEpisodeAirDate,
    };
  }

  private async computeProgress(
    journalShowId: string,
    providerShowId: string,
    journalEpisodes: JournalEpisodeEntry[],
    currentSeason: number,
    currentEpisode: number,
    totalEpisodesSnapshot: number,
    useProvider: boolean,
  ): Promise<ProgressSummary> {
    if (!useProvider) {
      return this.computeProgressFromDb(
        {
          currentSeason,
          currentEpisode,
          totalEpisodes: totalEpisodesSnapshot,
        } as JournalShowSummary,
        journalEpisodes,
      );
    }

    const watchedIds = new Set(journalEpisodes.map((episode) => episode.providerEpisodeId));
    let totalEpisodes = totalEpisodesSnapshot;
    let episodesWatched = journalEpisodes.length;
    let episodesRemaining = 0;
    let progressPercent = 0;
    let nextEpisode: ProgressSummary["nextEpisode"] = null;
    let nextEpisodeAirDate: string | null = null;

    try {
      const providerEpisodes = await this.provider.getEpisodes(providerShowId);
      totalEpisodes = providerEpisodes.length;

      if (watchedIds.size > 0) {
        episodesWatched = providerEpisodes.filter((episode) => watchedIds.has(episode.id)).length;
      } else if (currentEpisode > 0 || currentSeason > 1) {
        episodesWatched = providerEpisodes.reduce((count, episode) => {
          const season = episode.season ?? 0;
          const number = episode.number ?? 0;
          if (season < currentSeason) return count + 1;
          if (season === currentSeason && number <= currentEpisode) return count + 1;
          return count;
        }, 0);
      }

      episodesRemaining = Math.max(0, totalEpisodes - episodesWatched);
      progressPercent = totalEpisodes > 0 ? Math.round((episodesWatched / totalEpisodes) * 100) : 0;

      const upcoming = providerEpisodes
        .filter((episode) => !watchedIds.has(episode.id))
        .sort((left, right) => {
          const leftSeason = left.season ?? 0;
          const rightSeason = right.season ?? 0;
          if (leftSeason !== rightSeason) return leftSeason - rightSeason;
          return (left.number ?? 0) - (right.number ?? 0);
        })[0] ?? null;

      nextEpisode = upcoming
        ? { season: upcoming.season ?? null, number: upcoming.number ?? null, airstamp: upcoming.airstamp ?? null, name: upcoming.name ?? null }
        : null;
      nextEpisodeAirDate = upcoming?.airstamp ?? upcoming?.airdate ?? null;

      await this.journal.updateProgressSnapshots(journalShowId, totalEpisodes, this.episodeSnapshotsFromProvider(providerEpisodes).totalRuntimeMinutes);
    } catch {
      return this.computeProgressFromDb(
        { currentSeason, currentEpisode, totalEpisodes: totalEpisodesSnapshot } as JournalShowSummary,
        journalEpisodes,
      );
    }

    return {
      currentSeason,
      currentEpisode,
      episodesWatched,
      totalEpisodes,
      episodesRemaining,
      progressPercent,
      nextEpisode,
      nextEpisodeAirDate,
    };
  }

  private async enrichShowsLight(showsPromise: Promise<JournalShowSummary[]>): Promise<JournalShowSummary[]> {
    const shows = await showsPromise;
    return Promise.all(
      shows.map(async (show) => {
        const journalEpisodes = await this.journal.listEpisodesForShow(show.id);
        const progress = this.computeProgressFromDb(show, journalEpisodes);
        return { ...show, ...progress };
      }),
    );
  }

  private episodeSnapshotsFromProvider(episodes: TVEpisode[]) {
    return {
      totalEpisodes: episodes.length,
      totalRuntimeMinutes: episodes.reduce((sum, episode) => sum + (episode.runtime ?? 45), 0),
    };
  }

  private metadataFromShow(show: TVShow) {
    return {
      genresSnapshot: JSON.stringify(show.genres),
      networkSnapshot: show.network ?? show.webChannel ?? null,
      endedSnapshot: show.ended,
      runtimeSnapshot: show.averageRuntime ?? show.runtime ?? null,
    };
  }

  private async requireProviderShow(showId: string): Promise<TVShow> {
    const current = await this.journal.getShow(showId);
    if (!current) {
      throw notFound("Show not found");
    }
    return this.provider.getShow(current.provider_show_id);
  }

  private async requireShowByProvider(providerShowId: string): Promise<JournalShowSummary> {
    const show = await this.journal.getShow(providerShowId);
    if (!show) {
      throw notFound("Show not found");
    }
    const enriched = await this.enrichShowsLight(Promise.resolve([this.toSummary(show)]));
    return enriched[0]!;
  }

  private toSummary(show: Awaited<ReturnType<JournalRepository["getShow"]>> extends infer T ? NonNullable<T> : never): JournalShowSummary {
    let genresSnapshot: string[] | null = null;
    if ((show as any).genres_snapshot) {
      try {
        genresSnapshot = JSON.parse((show as any).genres_snapshot);
      } catch {
        genresSnapshot = null;
      }
    }

    const premiered = show.premiered_snapshot;
    const ended = (show as any).ended_snapshot as string | null | undefined;
    const yearSnapshot = premiered ? Number.parseInt(premiered.slice(0, 4), 10) : ended ? Number.parseInt(ended.slice(0, 4), 10) : null;

    return {
      id: show.id,
      provider: show.provider as JournalShowSummary["provider"],
      providerShowId: show.provider_show_id,
      status: show.status,
      sortOrder: show.sort_order,
      showNameSnapshot: show.show_name_snapshot,
      summarySnapshot: show.summary_snapshot,
      imageSnapshot: show.image_snapshot,
      premieredSnapshot: show.premiered_snapshot,
      nextEpisodeAirDate: show.next_episode_air_date,
      metadataRefreshedAt: show.metadata_refreshed_at,
      watchedEpisodeCount: show.watched_episode_count,
      latestReviewBody: show.latest_review_body,
      latestRating: show.latest_rating,
      latestNoteBody: show.latest_note_body,
      currentSeason: show.current_season ?? 1,
      currentEpisode: show.current_episode ?? 0,
      progressUpdatedAt: show.progress_updated_at ?? null,
      genresSnapshot,
      networkSnapshot: (show as any).network_snapshot ?? null,
      endedSnapshot: ended ?? null,
      runtimeSnapshot: (show as any).runtime_snapshot ?? null,
      totalEpisodes: (show as any).total_episodes_snapshot ?? undefined,
      yearSnapshot: Number.isFinite(yearSnapshot) ? yearSnapshot : null,
      ...(show as any).created_at ? { createdAt: (show as any).created_at } : {},
      ...(show as any).updated_at ? { updatedAt: (show as any).updated_at } : {},
    };
  }
}
