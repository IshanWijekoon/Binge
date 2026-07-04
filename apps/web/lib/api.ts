export type MediaType = "movie" | "show";
export type UserMediaStatus = "watchlist" | "watching" | "completed" | "paused" | "dropped";
export type Visibility = "public" | "friends" | "private";
export type JournalShowStatus = "watching" | "completed" | "plan-to-watch" | "on-hold" | "dropped";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  privacyLevel: Visibility;
}

export interface MediaItem {
  id?: string;
  media_item_id?: string;
  mediaType?: MediaType;
  media_type?: MediaType;
  tmdbId?: number;
  tmdb_id?: number;
  title?: string;
  name?: string;
  posterPath?: string | null;
  poster_path?: string | null;
  releaseDate?: string | null;
  release_date?: string | null;
  voteAverage?: number;
  vote_average?: number;
  popularity?: number;
  status?: UserMediaStatus;
}

export interface Stats {
  movies_watched?: number;
  episodes_watched?: number;
  completed_titles?: number;
  reviews_written?: number;
  ratings_given?: number;
  followed_shows?: number;
  shows_watched?: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface TVShow {
  id: string;
  providerId: number;
  name: string;
  summary: string | null;
  status: string | null;
  premiered: string | null;
  ended: string | null;
  image: { medium: string | null; original: string | null } | null;
  genres: string[];
  runtime: number | null;
  averageRuntime: number | null;
  schedule: { time: string | null; days: string[] };
  network: string | null;
  webChannel: string | null;
  officialSite: string | null;
}

export interface TVSearchResult {
  score: number;
  show: TVShow;
}

export interface TVSeason {
  id: string;
  providerId: number;
  showId: string;
  number: number;
  name: string | null;
  episodeOrder: number | null;
  premiereDate: string | null;
  endDate: string | null;
  image: { medium: string | null; original: string | null } | null;
}

export interface TVEpisode {
  id: string;
  providerId: number;
  showId: string | null;
  season: number | null;
  number: number | null;
  name: string;
  summary: string | null;
  airdate: string | null;
  airtime: string | null;
  airstamp: string | null;
  runtime: number | null;
  image: { medium: string | null; original: string | null } | null;
  show?: TVShow;
}

export interface FollowedShow {
  id: string;
  provider_show_id: string;
  show_name_snapshot: string | null;
  image_snapshot: string | null;
  followed_at: string;
}

export interface WatchHistoryItem {
  id: string;
  provider_show_id: string;
  provider_episode_id: string;
  show_name_snapshot: string | null;
  episode_name_snapshot: string | null;
  season_number_snapshot: number | null;
  episode_number_snapshot: number | null;
  watched_at: string;
}

export interface JournalShowSummary {
  id: string;
  provider: "tvmaze";
  providerShowId: string;
  status: JournalShowStatus;
  sortOrder: number;
  showNameSnapshot: string;
  summarySnapshot: string | null;
  imageSnapshot: string | null;
  premieredSnapshot: string | null;
  nextEpisodeAirDate: string | null;
  metadataRefreshedAt: string | null;
  watchedEpisodeCount: number;
  latestReviewBody: string | null;
  latestRating: number | null;
  latestNoteBody: string | null;
  currentSeason?: number;
  currentEpisode?: number;
  progressUpdatedAt?: string | null;
  genresSnapshot?: string[] | null;
  networkSnapshot?: string | null;
  endedSnapshot?: string | null;
  runtimeSnapshot?: number | null;
  yearSnapshot?: number | null;
  totalEpisodes?: number;
  episodesWatched?: number;
  episodesRemaining?: number;
  progressPercent?: number;
  nextEpisode?: { season: number | null; number: number | null; airstamp?: string | null; name?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JournalEpisodeEntry {
  id: string;
  journalShowId: string;
  providerEpisodeId: string;
  showNameSnapshot: string;
  episodeNameSnapshot: string;
  seasonNumberSnapshot: number | null;
  episodeNumberSnapshot: number | null;
  watchedAt: string;
  progressSeconds: number;
}

export interface JournalReviewEntry {
  id: string;
  journalShowId: string;
  showNameSnapshot: string;
  body: string;
  containsSpoilers: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalNoteEntry {
  id: string;
  journalShowId: string;
  showNameSnapshot: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalRatingEntry {
  id: string;
  journalShowId: string;
  showNameSnapshot: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  total_shows: number;
  watching_shows: number;
  completed_shows: number;
  plan_to_watch_shows: number;
  on_hold_shows: number;
  dropped_shows: number;
  episodes_watched: number;
  reviews_written: number;
  ratings_given: number;
  hours_watched?: number;
  average_rating?: number | null;
  shows_added_this_year?: number;
  top_genres?: Array<{ name: string; count: number }>;
  top_networks?: Array<{ name: string; count: number }>;
  monthly_episodes_watched?: Array<{ month: string; count: number }>;
  watching_trend?: Array<{ month: string; watching: number; completed: number }>;
}

export interface ActivityEntry {
  id: string;
  journalShowId: string;
  showNameSnapshot: string;
  showImageSnapshot: string | null;
  episodeNameSnapshot: string;
  seasonNumberSnapshot: number | null;
  episodeNumberSnapshot: number | null;
  watchedAt: string;
}

export interface PublicFeed {
  continueWatching: JournalShowSummary[];
  upcomingEpisodes: CalendarEntry[];
  recentlyAdded: JournalShowSummary[];
  recentlyFinished: JournalShowSummary[];
  recentActivity: ActivityEntry[];
}

export interface CalendarEntry {
  show: JournalShowSummary;
  episode: TVEpisode;
}

export interface PublicShowDetail extends JournalShowSummary {
  review: JournalReviewEntry | null;
  note: JournalNoteEntry | null;
  rating: JournalRatingEntry | null;
  episodes: JournalEpisodeEntry[];
  // progress fields
  totalEpisodes?: number;
  episodesWatched?: number;
  episodesRemaining?: number;
  progressPercent?: number;
  nextEpisode?: { season: number | null; number: number | null; airstamp?: string | null; name?: string | null } | null;
}

export interface AdminSession {
  id: string;
  expiresAt: string;
}

export interface ApiErrorBody {
  error?: {
    code: string;
    message: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(init.body instanceof FormData || init.body instanceof Blob ? {} : { "content-type": "application/json" }),
      ...init.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep the status-based message when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  publicShows: () => request<{ shows: JournalShowSummary[] }>("/public/shows"),
  publicShow: (id: string) => request<{ show: PublicShowDetail }>(`/public/shows/${encodeURIComponent(id)}`),
  publicShowsByStatus: (status: JournalShowStatus) => request<{ shows: JournalShowSummary[] }>(`/public/shows/status/${encodeURIComponent(status)}`),
  publicCalendar: () => request<{ entries: CalendarEntry[] }>("/public/calendar"),
  publicReviews: () => request<{ reviews: JournalReviewEntry[] }>("/public/reviews"),
  publicStats: () => request<{ stats: JournalStats }>("/public/stats"),
  publicFeed: () => request<{ feed: PublicFeed }>("/public/feed"),

  adminLogin: (password: string) => request<{ authenticated: true; admin: AdminSession }>("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  adminMe: () => request<{ authenticated: true; admin: AdminSession }>("/admin/me"),
  adminLogout: () => request<void>("/admin/logout", { method: "POST" }),
  adminSearchShows: (query: string) => request<{ results: TVSearchResult[] }>(`/admin/shows/search?q=${encodeURIComponent(query)}`),
  adminShows: () => request<{ shows: JournalShowSummary[] }>("/admin/shows"),
  adminShow: (id: string) => request<{ show: PublicShowDetail }>(`/admin/shows/${encodeURIComponent(id)}`),
  adminAddShow: (showId: string, status: JournalShowStatus = "plan-to-watch") =>
    request<{ show: JournalShowSummary }>("/admin/shows", { method: "POST", body: JSON.stringify({ showId, status }) }),
  adminUpdateShow: (id: string, input: { status?: JournalShowStatus; sortOrder?: number; currentSeason?: number; currentEpisode?: number }) =>
    request<{ show: JournalShowSummary }>(`/admin/shows/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }),
  adminDeleteShow: (id: string) => request<void>(`/admin/shows/${encodeURIComponent(id)}`, { method: "DELETE" }),
  adminRefreshShow: (id: string) => request<{ show: JournalShowSummary }>(`/admin/shows/${encodeURIComponent(id)}/refresh`, { method: "POST" }),
  adminMarkEpisodeWatched: (id: string, progressSeconds?: number) =>
    request<{ show: PublicShowDetail }>(`/admin/episodes/${encodeURIComponent(id)}/watched`, { method: "POST", body: JSON.stringify({ ...(progressSeconds !== undefined ? { progressSeconds } : {}) }) }),
  adminUnmarkEpisodeWatched: (id: string) =>
    request<{ show: PublicShowDetail }>(`/admin/episodes/${encodeURIComponent(id)}/unwatched`, { method: "POST" }),
  adminMarkNextEpisode: (showId: string) =>
    request<{ show: PublicShowDetail }>(`/admin/shows/${encodeURIComponent(showId)}/mark-next`, { method: "POST" }),
  adminMarkSeasonWatched: (showId: string, season: number) =>
    request<{ show: PublicShowDetail }>(`/admin/shows/${encodeURIComponent(showId)}/seasons/${season}/watched`, { method: "POST" }),
  adminMarkSeasonsWatched: (showId: string, seasons: number[]) =>
    request<{ show: PublicShowDetail }>(`/admin/shows/${encodeURIComponent(showId)}/seasons/batch/watched`, {
      method: "POST",
      body: JSON.stringify({ seasons }),
    }),
  adminMarkEpisodesWatched: (episodeIds: string[]) =>
    request<{ show: PublicShowDetail }>("/admin/episodes/batch/watched", {
      method: "POST",
      body: JSON.stringify({ episodeIds }),
    }),
  adminUpsertReview: (input: { showId: string; body: string; containsSpoilers?: boolean }) =>
    request<{ ok: true }>("/admin/reviews", { method: "POST", body: JSON.stringify(input) }),
  adminUpsertRating: (input: { showId: string; rating: number }) =>
    request<{ ok: true }>("/admin/ratings", { method: "POST", body: JSON.stringify(input) }),
  adminUpsertNote: (input: { showId: string; body: string }) =>
    request<{ ok: true }>("/admin/notes", { method: "POST", body: JSON.stringify(input) }),

  searchShows: (query: string) => request<{ results: TVSearchResult[] }>(`/tv/search?q=${encodeURIComponent(query)}`),
  getShow: (showId: string) => request<{ show: TVShow }>(`/tv/shows/${encodeURIComponent(showId)}`),
  getSeasons: (showId: string) => request<{ seasons: TVSeason[] }>(`/tv/shows/${encodeURIComponent(showId)}/seasons`),
  getEpisodes: (showId: string, includeSpecials = false) =>
    request<{ episodes: TVEpisode[] }>(`/tv/shows/${encodeURIComponent(showId)}/episodes${includeSpecials ? "?specials=1" : ""}`),
  getEpisode: (episodeId: string) => request<{ episode: TVEpisode }>(`/tv/episodes/${encodeURIComponent(episodeId)}`),
  todaySchedule: (country = "US") => request<{ episodes: TVEpisode[] }>(`/tv/schedule/today?country=${encodeURIComponent(country)}`),
  upcomingEpisodes: () => request<{ episodes: TVEpisode[] }>("/tv/episodes/upcoming"),
  recentlyAiredEpisodes: () => request<{ episodes: TVEpisode[] }>("/tv/episodes/recent"),
  follows: () => request<{ follows: FollowedShow[] }>("/follows"),
  followShow: (showId: string) => request<{ follow: FollowedShow }>("/follows", { method: "POST", body: JSON.stringify({ showId }) }),
  unfollowShow: (showId: string) => request<void>(`/follows/${encodeURIComponent(showId)}`, { method: "DELETE" }),
  watchHistory: () => request<{ history: WatchHistoryItem[] }>("/watch-history"),
  markEpisodeWatchedById: (episodeId: string) =>
    request<{ history: WatchHistoryItem }>("/watch-history/episodes", { method: "POST", body: JSON.stringify({ episodeId }) }),
};

export function posterUrl(path?: string | null, size = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function titleOf(item: MediaItem) {
  return item.title ?? item.name ?? "Untitled";
}

export function mediaTypeOf(item: MediaItem): MediaType {
  return item.mediaType ?? item.media_type ?? "show";
}

export function tmdbIdOf(item: MediaItem) {
  return item.tmdbId ?? item.tmdb_id ?? 0;
}
