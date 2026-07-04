export type MediaType = "movie" | "show";
export type UserMediaStatus = "watchlist" | "watching" | "completed" | "paused" | "dropped";
export type Visibility = "public" | "friends" | "private";
export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type TVProviderName = "tvmaze";
export type JournalShowStatus = "watching" | "completed" | "plan-to-watch" | "on-hold" | "dropped";

export interface AdminSession {
  id: string;
  expiresAt: string;
}

export interface JournalShowSummary {
  id: string;
  provider: TVProviderName;
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
  nextEpisode?: ProgressSummary["nextEpisode"];
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
  runtimeMinutesSnapshot?: number | null;
  showImageSnapshot?: string | null;
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

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  privacyLevel: Visibility;
}

export interface MediaSummary {
  id: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  popularity: number;
  voteAverage: number;
}

export interface TVImage {
  medium: string | null;
  original: string | null;
}

export interface TVShow {
  id: string;
  provider: TVProviderName;
  providerId: number;
  name: string;
  summary: string | null;
  status: string | null;
  premiered: string | null;
  ended: string | null;
  image: TVImage | null;
  genres: string[];
  runtime: number | null;
  averageRuntime: number | null;
  schedule: {
    time: string | null;
    days: string[];
  };
  network: string | null;
  webChannel: string | null;
  officialSite: string | null;
}

export interface TVSeason {
  id: string;
  provider: TVProviderName;
  providerId: number;
  showId: string;
  number: number;
  name: string | null;
  episodeOrder: number | null;
  premiereDate: string | null;
  endDate: string | null;
  image: TVImage | null;
}

export interface TVEpisode {
  id: string;
  provider: TVProviderName;
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
  image: TVImage | null;
  show?: TVShow;
}

export interface TVSearchResult {
  score: number;
  show: TVShow;
}

export interface TVScheduleOptions {
  country?: string;
  date?: string;
  web?: boolean;
}

export interface ProgressSummary {
  currentSeason: number;
  currentEpisode: number;
  episodesWatched: number;
  totalEpisodes: number;
  episodesRemaining: number;
  progressPercent: number;
  nextEpisode?: {
    season: number | null;
    number: number | null;
    airstamp?: string | null;
    name?: string | null;
  } | null;
  nextEpisodeAirDate?: string | null;
}
