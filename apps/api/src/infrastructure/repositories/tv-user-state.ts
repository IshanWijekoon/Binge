import type { TVEpisode, TVShow } from "../../domain/types";
import { D1Repository, type Row } from "./d1";

export class FollowedShowRepository extends D1Repository {
  async follow(userId: string, show: TVShow): Promise<Row> {
    const existing = await this.first<{ id: string }>(
      "SELECT id FROM followed_shows WHERE user_id = ? AND provider = ? AND provider_show_id = ?",
      userId,
      show.provider,
      show.id,
    );
    const id = existing?.id ?? crypto.randomUUID();
    await this.run(
      `INSERT INTO followed_shows (id, user_id, provider, provider_show_id, show_name_snapshot, image_snapshot, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, provider, provider_show_id) DO UPDATE SET
         show_name_snapshot = excluded.show_name_snapshot,
         image_snapshot = excluded.image_snapshot,
         updated_at = CURRENT_TIMESTAMP`,
      id,
      userId,
      show.provider,
      show.id,
      show.name,
      show.image?.medium ?? show.image?.original ?? null,
    );
    return this.required<Row>("SELECT * FROM followed_shows WHERE id = ?", "Followed show not found", id);
  }

  async unfollow(userId: string, showId: string): Promise<void> {
    await this.run("DELETE FROM followed_shows WHERE user_id = ? AND provider_show_id = ?", userId, showId);
  }

  async list(userId: string): Promise<Row[]> {
    return this.all(
      `SELECT * FROM followed_shows
       WHERE user_id = ?
       ORDER BY followed_at DESC`,
      userId,
    );
  }
}

export class EpisodeWatchHistoryRepository extends D1Repository {
  async markWatched(userId: string, episode: TVEpisode): Promise<Row> {
    const showId = episode.showId ?? episode.show?.id;
    const showName = episode.show?.name ?? null;
    const existing = await this.first<{ id: string }>(
      "SELECT id FROM episode_watch_history WHERE user_id = ? AND provider = ? AND provider_episode_id = ?",
      userId,
      episode.provider,
      episode.id,
    );
    const id = existing?.id ?? crypto.randomUUID();
    await this.run(
      `INSERT INTO episode_watch_history (
         id, user_id, provider, provider_show_id, provider_episode_id, show_name_snapshot,
         episode_name_snapshot, season_number_snapshot, episode_number_snapshot, watched_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, provider, provider_episode_id) DO UPDATE SET
         watched_at = CURRENT_TIMESTAMP,
         show_name_snapshot = COALESCE(excluded.show_name_snapshot, episode_watch_history.show_name_snapshot),
         episode_name_snapshot = excluded.episode_name_snapshot,
         season_number_snapshot = excluded.season_number_snapshot,
         episode_number_snapshot = excluded.episode_number_snapshot,
         updated_at = CURRENT_TIMESTAMP`,
      id,
      userId,
      episode.provider,
      showId ?? "",
      episode.id,
      showName,
      episode.name,
      episode.season,
      episode.number,
    );
    return this.required<Row>("SELECT * FROM episode_watch_history WHERE id = ?", "Watch history not found", id);
  }

  async delete(userId: string, episodeId: string): Promise<void> {
    await this.run("DELETE FROM episode_watch_history WHERE user_id = ? AND provider_episode_id = ?", userId, episodeId);
  }

  async list(userId: string, limit = 100): Promise<Row[]> {
    return this.all(
      `SELECT * FROM episode_watch_history
       WHERE user_id = ?
       ORDER BY watched_at DESC
       LIMIT ?`,
      userId,
      limit,
    );
  }

  async stats(userId: string): Promise<Row> {
    return this.required<Row>(
      `SELECT
         (SELECT COUNT(*) FROM followed_shows WHERE user_id = ?) AS followed_shows,
         (SELECT COUNT(*) FROM episode_watch_history WHERE user_id = ?) AS episodes_watched,
         (SELECT COUNT(DISTINCT provider_show_id) FROM episode_watch_history WHERE user_id = ?) AS shows_watched,
         (SELECT COUNT(*) FROM ratings WHERE user_id = ?) AS ratings_given,
         (SELECT COUNT(*) FROM reviews WHERE user_id = ?) AS reviews_written`,
      "Stats not found",
      userId,
      userId,
      userId,
      userId,
      userId,
    );
  }
}
