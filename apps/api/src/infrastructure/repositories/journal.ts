import type { ActivityEntry, JournalEpisodeEntry, JournalNoteEntry, JournalRatingEntry, JournalReviewEntry, JournalShowStatus, JournalShowSummary, JournalStats, TVEpisode, TVShow } from "../../domain/types";
import { D1Repository, type Row } from "./d1";

export interface JournalShowRow extends Row {
  id: string;
  provider: string;
  provider_show_id: string;
  status: JournalShowStatus;
  sort_order: number;
  show_name_snapshot: string;
  summary_snapshot: string | null;
  image_snapshot: string | null;
  premiered_snapshot: string | null;
  next_episode_air_date: string | null;
  metadata_refreshed_at: string | null;
  watched_episode_count: number;
  latest_review_body: string | null;
  latest_rating: number | null;
  latest_note_body: string | null;
  current_season?: number;
  current_episode?: number;
  progress_updated_at?: string | null;
  genres_snapshot?: string | null;
  network_snapshot?: string | null;
  ended_snapshot?: string | null;
  runtime_snapshot?: number | null;
  total_episodes_snapshot?: number | null;
  total_runtime_minutes_snapshot?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface JournalShowDetailRow extends JournalShowRow {
  latest_review_contains_spoilers: number | null;
  latest_review_created_at: string | null;
  latest_review_updated_at: string | null;
  latest_note_created_at: string | null;
  latest_note_updated_at: string | null;
  latest_rating_created_at: string | null;
  latest_rating_updated_at: string | null;
}

export interface JournalReviewRow extends Row {
  id: string;
  journal_show_id: string;
  show_name_snapshot: string;
  body: string;
  contains_spoilers: number;
  created_at: string;
  updated_at: string;
}

export interface JournalNoteRow extends Row {
  id: string;
  journal_show_id: string;
  show_name_snapshot: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface JournalRatingRow extends Row {
  id: string;
  journal_show_id: string;
  show_name_snapshot: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface JournalEpisodeRow extends Row {
  id: string;
  journal_show_id: string;
  provider_episode_id: string;
  show_name_snapshot: string;
  episode_name_snapshot: string;
  season_number_snapshot: number | null;
  episode_number_snapshot: number | null;
  watched_at: string;
  progress_seconds: number;
  runtime_minutes_snapshot?: number | null;
  created_at: string;
  updated_at: string;
}

interface JournalStatsRow extends Row {
  total_shows: number;
  watching_shows: number;
  completed_shows: number;
  plan_to_watch_shows: number;
  on_hold_shows: number;
  dropped_shows: number;
  episodes_watched: number;
  reviews_written: number;
  ratings_given: number;
}

export class JournalRepository extends D1Repository {
  async listShows(): Promise<JournalShowSummary[]> {
    try {
      return (await this.all<JournalShowRow>(this.showSummaryQuery() + " ORDER BY js.sort_order ASC, js.created_at DESC")).map((row) => this.toSummary(row));
    } catch (err) {
      const rows = await this.all<JournalShowRow>(this.showSummaryQueryWithoutProgress() + " ORDER BY js.sort_order ASC, js.created_at DESC");
      return rows.map((row) => this.toSummary(row));
    }
  }

  async listShowsByStatus(status: JournalShowStatus): Promise<JournalShowSummary[]> {
    try {
      return (await this.all<JournalShowRow>(this.showSummaryQuery() + " WHERE js.status = ? ORDER BY js.sort_order ASC, js.created_at DESC", status)).map((row) => this.toSummary(row));
    } catch (err) {
      const rows = await this.all<JournalShowRow>(this.showSummaryQueryWithoutProgress() + " WHERE js.status = ? ORDER BY js.sort_order ASC, js.created_at DESC", status);
      return rows.map((row) => this.toSummary(row));
    }
  }

  async getShow(id: string): Promise<JournalShowDetailRow | null> {
    try {
      return this.first<JournalShowDetailRow>(this.showSummaryQuery() + " WHERE js.id = ? OR js.provider_show_id = ? LIMIT 1", id, id);
    } catch (err) {
      return this.first<JournalShowDetailRow>(this.showSummaryQueryWithoutProgress() + " WHERE js.id = ? OR js.provider_show_id = ? LIMIT 1", id, id);
    }
  }

  async listReviews(): Promise<JournalReviewEntry[]> {
    const rows = await this.all<JournalReviewRow>(
      `SELECT jr.*
       FROM journal_reviews jr
       ORDER BY jr.updated_at DESC, jr.created_at DESC`,
    );
    return rows.map((row) => ({
      id: row.id,
      journalShowId: row.journal_show_id,
      showNameSnapshot: row.show_name_snapshot,
      body: row.body,
      containsSpoilers: Boolean(row.contains_spoilers),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listNotes(): Promise<JournalNoteEntry[]> {
    const rows = await this.all<JournalNoteRow>(
      `SELECT jn.*
       FROM journal_notes jn
       ORDER BY jn.updated_at DESC, jn.created_at DESC`,
    );
    return rows.map((row) => ({
      id: row.id,
      journalShowId: row.journal_show_id,
      showNameSnapshot: row.show_name_snapshot,
      body: row.body,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listRatings(): Promise<JournalRatingEntry[]> {
    const rows = await this.all<JournalRatingRow>(
      `SELECT jra.*
       FROM journal_ratings jra
       ORDER BY jra.updated_at DESC, jra.created_at DESC`,
    );
    return rows.map((row) => ({
      id: row.id,
      journalShowId: row.journal_show_id,
      showNameSnapshot: row.show_name_snapshot,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listEpisodesForShow(journalShowId: string): Promise<JournalEpisodeEntry[]> {
    const rows = await this.all<JournalEpisodeRow>(
      `SELECT * FROM journal_episodes WHERE journal_show_id = ? ORDER BY season_number_snapshot ASC, episode_number_snapshot ASC`,
      journalShowId,
    );
    return rows.map((row) => this.toEpisodeEntry(row));
  }

  async listRecentActivity(limit = 15): Promise<ActivityEntry[]> {
    const rows = await this.all<JournalEpisodeRow & { show_image_snapshot: string | null }>(
      `SELECT je.*, js.image_snapshot AS show_image_snapshot
       FROM journal_episodes je
       JOIN journal_shows js ON js.id = je.journal_show_id
       ORDER BY je.watched_at DESC, je.created_at DESC
       LIMIT ?`,
      limit,
    );
    return rows.map((row) => ({
      id: row.id,
      journalShowId: row.journal_show_id,
      showNameSnapshot: row.show_name_snapshot,
      showImageSnapshot: row.show_image_snapshot,
      episodeNameSnapshot: row.episode_name_snapshot,
      seasonNumberSnapshot: row.season_number_snapshot,
      episodeNumberSnapshot: row.episode_number_snapshot,
      watchedAt: row.watched_at,
    }));
  }

  async deleteEpisodeByProviderId(providerEpisodeId: string): Promise<void> {
    await this.run("DELETE FROM journal_episodes WHERE provider_episode_id = ?", providerEpisodeId);
  }

  async extendedStats(): Promise<Partial<JournalStats>> {
    const averageRating = await this.first<{ average_rating: number | null }>(
      `SELECT AVG(rating) AS average_rating FROM journal_ratings`,
    );

    const showsAddedThisYear = await this.first<{ count: number }>(
      `SELECT COUNT(*) AS count FROM journal_shows WHERE strftime('%Y', created_at) = strftime('%Y', 'now')`,
    );

    const hoursWatched = await this.first<{ hours: number }>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN js.status = 'completed' THEN COALESCE(js.total_runtime_minutes_snapshot, 0)
           ELSE COALESCE((
             SELECT SUM(COALESCE(je.runtime_minutes_snapshot, 45))
             FROM journal_episodes je WHERE je.journal_show_id = js.id
           ), 0)
         END
       ), 0) / 60.0 AS hours
       FROM journal_shows js`,
    );

    const monthlyRows = await this.all<{ month: string; count: number }>(
      `SELECT month, SUM(count) AS count FROM (
         SELECT strftime('%Y-%m', je.watched_at) AS month, COUNT(*) AS count
         FROM journal_episodes je
         GROUP BY month
         UNION ALL
         SELECT strftime('%Y-%m', js.updated_at) AS month, COALESCE(js.total_episodes_snapshot, 0) AS count
         FROM journal_shows js
         WHERE js.status = 'completed'
           AND NOT EXISTS (SELECT 1 FROM journal_episodes je2 WHERE je2.journal_show_id = js.id)
       )
       GROUP BY month
       ORDER BY month ASC`,
    );

    const genreRows = await this.all<{ genres_snapshot: string | null; count: number }>(
      `SELECT js.genres_snapshot,
              CASE
                WHEN js.status = 'completed' THEN COALESCE(js.total_episodes_snapshot, (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id))
                ELSE (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id)
              END AS count
       FROM journal_shows js
       WHERE js.genres_snapshot IS NOT NULL
         AND (
           js.status = 'completed'
           OR EXISTS (SELECT 1 FROM journal_episodes je WHERE je.journal_show_id = js.id)
         )`,
    );

    const networkRows = await this.all<{ network_snapshot: string | null; count: number }>(
      `SELECT js.network_snapshot,
              CASE
                WHEN js.status = 'completed' THEN COALESCE(js.total_episodes_snapshot, (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id))
                ELSE (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id)
              END AS count
       FROM journal_shows js
       WHERE js.network_snapshot IS NOT NULL
         AND (
           js.status = 'completed'
           OR EXISTS (SELECT 1 FROM journal_episodes je WHERE je.journal_show_id = js.id)
         )`,
    );

    const trendRows = await this.all<{ month: string; watching: number; completed: number }>(
      `SELECT strftime('%Y-%m', created_at) AS month,
              SUM(CASE WHEN status = 'watching' THEN 1 ELSE 0 END) AS watching,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM journal_shows
       WHERE created_at >= datetime('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`,
    );

    const genreCounts = new Map<string, number>();
    for (const row of genreRows) {
      if (!row.genres_snapshot) continue;
      try {
        const genres = JSON.parse(row.genres_snapshot) as string[];
        for (const genre of genres) {
          genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + row.count);
        }
      } catch {
        // ignore malformed snapshots
      }
    }

    const networkCounts = new Map<string, number>();
    for (const row of networkRows) {
      if (!row.network_snapshot) continue;
      networkCounts.set(row.network_snapshot, (networkCounts.get(row.network_snapshot) ?? 0) + row.count);
    }

    const topGenres = [...genreCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);

    const topNetworks = [...networkCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);

    return {
      hours_watched: Math.round((hoursWatched?.hours ?? 0) * 10) / 10,
      average_rating: averageRating?.average_rating ?? null,
      shows_added_this_year: showsAddedThisYear?.count ?? 0,
      top_genres: topGenres,
      top_networks: topNetworks,
      monthly_episodes_watched: monthlyRows,
      watching_trend: trendRows,
    };
  }

  async listEpisodes(): Promise<JournalEpisodeEntry[]> {
    const rows = await this.all<JournalEpisodeRow>(`SELECT * FROM journal_episodes ORDER BY watched_at DESC, created_at DESC`);
    return rows.map((row) => this.toEpisodeEntry(row));
  }

  async stats(): Promise<JournalStats> {
    const row = await this.first<JournalStatsRow>(
      `SELECT
         COUNT(*) as total_shows,
         COALESCE(SUM(CASE WHEN status = 'watching' THEN 1 ELSE 0 END), 0) as watching_shows,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_shows,
         COALESCE(SUM(CASE WHEN status = 'plan-to-watch' THEN 1 ELSE 0 END), 0) as plan_to_watch_shows,
         COALESCE(SUM(CASE WHEN status = 'on-hold' THEN 1 ELSE 0 END), 0) as on_hold_shows,
         COALESCE(SUM(CASE WHEN status = 'dropped' THEN 1 ELSE 0 END), 0) as dropped_shows,
         COALESCE(SUM(
           CASE
             WHEN status = 'completed' THEN COALESCE(total_episodes_snapshot, (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = journal_shows.id))
             ELSE (SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = journal_shows.id)
           END
         ), 0) as episodes_watched,
         (SELECT COUNT(*) FROM journal_reviews) as reviews_written,
         (SELECT COUNT(*) FROM journal_ratings) as ratings_given
       FROM journal_shows`,
    );

    return row ?? {
      total_shows: 0,
      watching_shows: 0,
      completed_shows: 0,
      plan_to_watch_shows: 0,
      on_hold_shows: 0,
      dropped_shows: 0,
      episodes_watched: 0,
      reviews_written: 0,
      ratings_given: 0,
    };
  }

  async upsertShow(input: {
    id: string;
    provider: string;
    providerShowId: string;
    status: JournalShowStatus;
    sortOrder: number;
    showNameSnapshot: string;
    summarySnapshot: string | null;
    imageSnapshot: string | null;
    premieredSnapshot: string | null;
    nextEpisodeAirDate: string | null;
    metadataRefreshedAt: string | null;
    currentSeason?: number;
    currentEpisode?: number;
    genresSnapshot?: string | null;
    networkSnapshot?: string | null;
    endedSnapshot?: string | null;
    runtimeSnapshot?: number | null;
  }): Promise<void> {
    await this.run(
      `INSERT INTO journal_shows (
         id, provider, provider_show_id, status, sort_order, show_name_snapshot, summary_snapshot, image_snapshot,
         premiered_snapshot, next_episode_air_date, metadata_refreshed_at, current_season, current_episode, progress_updated_at,
         genres_snapshot, network_snapshot, ended_snapshot, runtime_snapshot
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider_show_id) DO UPDATE SET
         status = excluded.status,
         sort_order = excluded.sort_order,
         show_name_snapshot = excluded.show_name_snapshot,
         summary_snapshot = excluded.summary_snapshot,
         image_snapshot = excluded.image_snapshot,
         premiered_snapshot = excluded.premiered_snapshot,
         next_episode_air_date = excluded.next_episode_air_date,
         metadata_refreshed_at = excluded.metadata_refreshed_at,
         current_season = COALESCE(excluded.current_season, journal_shows.current_season),
         current_episode = COALESCE(excluded.current_episode, journal_shows.current_episode),
         progress_updated_at = COALESCE(excluded.progress_updated_at, journal_shows.progress_updated_at),
         genres_snapshot = COALESCE(excluded.genres_snapshot, journal_shows.genres_snapshot),
         network_snapshot = COALESCE(excluded.network_snapshot, journal_shows.network_snapshot),
         ended_snapshot = COALESCE(excluded.ended_snapshot, journal_shows.ended_snapshot),
         runtime_snapshot = COALESCE(excluded.runtime_snapshot, journal_shows.runtime_snapshot),
         updated_at = CURRENT_TIMESTAMP`,
      input.id,
      input.provider,
      input.providerShowId,
      input.status,
      input.sortOrder,
      input.showNameSnapshot,
      input.summarySnapshot,
      input.imageSnapshot,
      input.premieredSnapshot,
      input.nextEpisodeAirDate,
      input.metadataRefreshedAt,
      input.currentSeason ?? 1,
      input.currentEpisode ?? 0,
      new Date().toISOString(),
      input.genresSnapshot ?? null,
      input.networkSnapshot ?? null,
      input.endedSnapshot ?? null,
      input.runtimeSnapshot ?? null,
    );
  }

  async updateShow(id: string, input: { status?: JournalShowStatus; sortOrder?: number; currentSeason?: number; currentEpisode?: number }): Promise<void> {
    await this.run(
      `UPDATE journal_shows
       SET status = COALESCE(?, status),
           sort_order = COALESCE(?, sort_order),
           current_season = COALESCE(?, current_season),
           current_episode = COALESCE(?, current_episode),
           progress_updated_at = CASE WHEN ? IS NOT NULL OR ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE progress_updated_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      input.status ?? null,
      input.sortOrder ?? null,
      (input as any).currentSeason ?? null,
      (input as any).currentEpisode ?? null,
      (input as any).currentSeason ?? null,
      (input as any).currentEpisode ?? null,
      id,
    );
  }

  async updateProgressSnapshots(id: string, totalEpisodes: number, totalRuntimeMinutes: number): Promise<void> {
    await this.run(
      `UPDATE journal_shows SET total_episodes_snapshot = ?, total_runtime_minutes_snapshot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      totalEpisodes,
      totalRuntimeMinutes,
      id,
    );
  }

  async refreshShow(id: string, input: {
    showNameSnapshot: string;
    summarySnapshot: string | null;
    imageSnapshot: string | null;
    premieredSnapshot: string | null;
    nextEpisodeAirDate: string | null;
    metadataRefreshedAt: string;
    genresSnapshot?: string | null;
    networkSnapshot?: string | null;
    endedSnapshot?: string | null;
    runtimeSnapshot?: number | null;
    totalEpisodesSnapshot?: number | null;
    totalRuntimeMinutesSnapshot?: number | null;
  }): Promise<void> {
    await this.run(
      `UPDATE journal_shows
       SET show_name_snapshot = ?, summary_snapshot = ?, image_snapshot = ?, premiered_snapshot = ?, next_episode_air_date = ?, metadata_refreshed_at = ?,
           genres_snapshot = COALESCE(?, genres_snapshot), network_snapshot = COALESCE(?, network_snapshot),
           ended_snapshot = COALESCE(?, ended_snapshot), runtime_snapshot = COALESCE(?, runtime_snapshot),
           total_episodes_snapshot = COALESCE(?, total_episodes_snapshot),
           total_runtime_minutes_snapshot = COALESCE(?, total_runtime_minutes_snapshot),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      input.showNameSnapshot,
      input.summarySnapshot,
      input.imageSnapshot,
      input.premieredSnapshot,
      input.nextEpisodeAirDate,
      input.metadataRefreshedAt,
      input.genresSnapshot ?? null,
      input.networkSnapshot ?? null,
      input.endedSnapshot ?? null,
      input.runtimeSnapshot ?? null,
      input.totalEpisodesSnapshot ?? null,
      input.totalRuntimeMinutesSnapshot ?? null,
      id,
    );
  }

  async deleteShow(id: string): Promise<void> {
    await this.run("DELETE FROM journal_shows WHERE id = ?", id);
  }

  async markEpisodeWatched(input: { show: TVShow; episode: TVEpisode; progressSeconds?: number; runtimeMinutes?: number | null }): Promise<void> {
    await this.run(
      `INSERT INTO journal_episodes (
         id, journal_show_id, provider_episode_id, show_name_snapshot, episode_name_snapshot,
         season_number_snapshot, episode_number_snapshot, watched_at, progress_seconds, runtime_minutes_snapshot
       ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
       ON CONFLICT(provider_episode_id) DO UPDATE SET
         watched_at = CURRENT_TIMESTAMP,
         progress_seconds = excluded.progress_seconds,
         episode_name_snapshot = excluded.episode_name_snapshot,
         season_number_snapshot = excluded.season_number_snapshot,
         episode_number_snapshot = excluded.episode_number_snapshot,
         runtime_minutes_snapshot = COALESCE(excluded.runtime_minutes_snapshot, journal_episodes.runtime_minutes_snapshot),
         updated_at = CURRENT_TIMESTAMP`,
      crypto.randomUUID(),
      input.show.id,
      input.episode.id,
      input.show.name,
      input.episode.name,
      input.episode.season,
      input.episode.number,
      input.progressSeconds ?? 0,
      input.runtimeMinutes ?? null,
    );
  }

  async upsertReview(input: { show: TVShow; body: string; containsSpoilers: boolean }): Promise<void> {
    await this.run(
      `INSERT INTO journal_reviews (id, journal_show_id, show_name_snapshot, body, contains_spoilers)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(journal_show_id) DO UPDATE SET
         show_name_snapshot = excluded.show_name_snapshot,
         body = excluded.body,
         contains_spoilers = excluded.contains_spoilers,
         updated_at = CURRENT_TIMESTAMP`,
      crypto.randomUUID(),
      input.show.id,
      input.show.name,
      input.body,
      input.containsSpoilers ? 1 : 0,
    );
  }

  async upsertNote(input: { show: TVShow; body: string }): Promise<void> {
    await this.run(
      `INSERT INTO journal_notes (id, journal_show_id, show_name_snapshot, body)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(journal_show_id) DO UPDATE SET
         show_name_snapshot = excluded.show_name_snapshot,
         body = excluded.body,
         updated_at = CURRENT_TIMESTAMP`,
      crypto.randomUUID(),
      input.show.id,
      input.show.name,
      input.body,
    );
  }

  async upsertRating(input: { show: TVShow; rating: number }): Promise<void> {
    await this.run(
      `INSERT INTO journal_ratings (id, journal_show_id, show_name_snapshot, rating)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(journal_show_id) DO UPDATE SET
         show_name_snapshot = excluded.show_name_snapshot,
         rating = excluded.rating,
         updated_at = CURRENT_TIMESTAMP`,
      crypto.randomUUID(),
      input.show.id,
      input.show.name,
      input.rating,
    );
  }

  private showSummaryQuery(): string {
    return `SELECT
        js.id,
        js.provider,
        js.provider_show_id,
        js.status,
        js.sort_order,
        js.show_name_snapshot,
        js.summary_snapshot,
        js.image_snapshot,
        js.premiered_snapshot,
        js.next_episode_air_date,
        js.metadata_refreshed_at,
        js.current_season,
        js.current_episode,
        js.progress_updated_at,
        js.genres_snapshot,
        js.network_snapshot,
        js.ended_snapshot,
        js.runtime_snapshot,
        js.total_episodes_snapshot,
        js.total_runtime_minutes_snapshot,
        js.created_at,
        js.updated_at,
        COALESCE((SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id), 0) AS watched_episode_count,
        (SELECT body FROM journal_reviews jr WHERE jr.journal_show_id = js.id ORDER BY jr.updated_at DESC, jr.created_at DESC LIMIT 1) AS latest_review_body,
        (SELECT rating FROM journal_ratings jra WHERE jra.journal_show_id = js.id ORDER BY jra.updated_at DESC, jra.created_at DESC LIMIT 1) AS latest_rating,
        (SELECT body FROM journal_notes jn WHERE jn.journal_show_id = js.id ORDER BY jn.updated_at DESC, jn.created_at DESC LIMIT 1) AS latest_note_body,
        (SELECT contains_spoilers FROM journal_reviews jr2 WHERE jr2.journal_show_id = js.id ORDER BY jr2.updated_at DESC, jr2.created_at DESC LIMIT 1) AS latest_review_contains_spoilers,
        (SELECT created_at FROM journal_reviews jr3 WHERE jr3.journal_show_id = js.id ORDER BY jr3.updated_at DESC, jr3.created_at DESC LIMIT 1) AS latest_review_created_at,
        (SELECT updated_at FROM journal_reviews jr4 WHERE jr4.journal_show_id = js.id ORDER BY jr4.updated_at DESC, jr4.created_at DESC LIMIT 1) AS latest_review_updated_at,
        (SELECT created_at FROM journal_notes jn2 WHERE jn2.journal_show_id = js.id ORDER BY jn2.updated_at DESC, jn2.created_at DESC LIMIT 1) AS latest_note_created_at,
        (SELECT updated_at FROM journal_notes jn3 WHERE jn3.journal_show_id = js.id ORDER BY jn3.updated_at DESC, jn3.created_at DESC LIMIT 1) AS latest_note_updated_at,
        (SELECT created_at FROM journal_ratings jra2 WHERE jra2.journal_show_id = js.id ORDER BY jra2.updated_at DESC, jra2.created_at DESC LIMIT 1) AS latest_rating_created_at,
        (SELECT updated_at FROM journal_ratings jra3 WHERE jra3.journal_show_id = js.id ORDER BY jra3.updated_at DESC, jra3.created_at DESC LIMIT 1) AS latest_rating_updated_at
      FROM journal_shows js`;
  }

  private showSummaryQueryWithoutProgress(): string {
    return `SELECT
        js.id,
        js.provider,
        js.provider_show_id,
        js.status,
        js.sort_order,
        js.show_name_snapshot,
        js.summary_snapshot,
        js.image_snapshot,
        js.premiered_snapshot,
        js.next_episode_air_date,
        js.metadata_refreshed_at,
        COALESCE((SELECT COUNT(*) FROM journal_episodes je WHERE je.journal_show_id = js.id), 0) AS watched_episode_count,
        (SELECT body FROM journal_reviews jr WHERE jr.journal_show_id = js.id ORDER BY jr.updated_at DESC, jr.created_at DESC LIMIT 1) AS latest_review_body,
        (SELECT rating FROM journal_ratings jra WHERE jra.journal_show_id = js.id ORDER BY jra.updated_at DESC, jra.created_at DESC LIMIT 1) AS latest_rating,
        (SELECT body FROM journal_notes jn WHERE jn.journal_show_id = js.id ORDER BY jn.updated_at DESC, jn.created_at DESC LIMIT 1) AS latest_note_body,
        (SELECT contains_spoilers FROM journal_reviews jr2 WHERE jr2.journal_show_id = js.id ORDER BY jr2.updated_at DESC, jr2.created_at DESC LIMIT 1) AS latest_review_contains_spoilers,
        (SELECT created_at FROM journal_reviews jr3 WHERE jr3.journal_show_id = js.id ORDER BY jr3.updated_at DESC, jr3.created_at DESC LIMIT 1) AS latest_review_created_at,
        (SELECT updated_at FROM journal_reviews jr4 WHERE jr4.journal_show_id = js.id ORDER BY jr4.updated_at DESC, jr4.created_at DESC LIMIT 1) AS latest_review_updated_at,
        (SELECT created_at FROM journal_notes jn2 WHERE jn2.journal_show_id = js.id ORDER BY jn2.updated_at DESC, jn2.created_at DESC LIMIT 1) AS latest_note_created_at,
        (SELECT updated_at FROM journal_notes jn3 WHERE jn3.journal_show_id = js.id ORDER BY jn3.updated_at DESC, jn3.created_at DESC LIMIT 1) AS latest_note_updated_at,
        (SELECT created_at FROM journal_ratings jra2 WHERE jra2.journal_show_id = js.id ORDER BY jra2.updated_at DESC, jra2.created_at DESC LIMIT 1) AS latest_rating_created_at,
        (SELECT updated_at FROM journal_ratings jra3 WHERE jra3.journal_show_id = js.id ORDER BY jra3.updated_at DESC, jra3.created_at DESC LIMIT 1) AS latest_rating_updated_at
      FROM journal_shows js`;
  }

  private toEpisodeEntry(row: JournalEpisodeRow): JournalEpisodeEntry {
    return {
      id: row.id,
      journalShowId: row.journal_show_id,
      providerEpisodeId: row.provider_episode_id,
      showNameSnapshot: row.show_name_snapshot,
      episodeNameSnapshot: row.episode_name_snapshot,
      seasonNumberSnapshot: row.season_number_snapshot,
      episodeNumberSnapshot: row.episode_number_snapshot,
      watchedAt: row.watched_at,
      progressSeconds: row.progress_seconds,
      runtimeMinutesSnapshot: row.runtime_minutes_snapshot ?? null,
    };
  }

  private toSummary(row: JournalShowRow): JournalShowSummary {
    return {
      id: row.id,
      provider: row.provider as JournalShowSummary["provider"],
      providerShowId: row.provider_show_id,
      status: row.status,
      sortOrder: row.sort_order,
      showNameSnapshot: row.show_name_snapshot,
      summarySnapshot: row.summary_snapshot,
      imageSnapshot: row.image_snapshot,
      premieredSnapshot: row.premiered_snapshot,
      nextEpisodeAirDate: row.next_episode_air_date,
      metadataRefreshedAt: row.metadata_refreshed_at,
      watchedEpisodeCount: row.watched_episode_count,
      latestReviewBody: row.latest_review_body,
      latestRating: row.latest_rating,
      latestNoteBody: row.latest_note_body,
      currentSeason: row.current_season ?? 1,
      currentEpisode: row.current_episode ?? 0,
      progressUpdatedAt: row.progress_updated_at ?? null,
      genresSnapshot: (() => {
        if (!row.genres_snapshot) return null;
        try {
          return JSON.parse(row.genres_snapshot) as string[];
        } catch {
          return null;
        }
      })(),
      networkSnapshot: row.network_snapshot ?? null,
      endedSnapshot: row.ended_snapshot ?? null,
      runtimeSnapshot: row.runtime_snapshot ?? null,
      ...(row.total_episodes_snapshot != null ? { totalEpisodes: row.total_episodes_snapshot } : {}),
      ...(row.created_at ? { createdAt: row.created_at } : {}),
      ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    };
  }
}
