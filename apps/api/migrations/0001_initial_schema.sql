PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_object_key TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'email')),
  provider_subject TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_subject)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_hash TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_login_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_items (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'show')),
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date TEXT,
  original_language TEXT,
  popularity REAL NOT NULL DEFAULT 0,
  vote_average REAL NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  runtime_minutes INTEGER,
  status TEXT,
  metadata_refreshed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (media_type, tmdb_id)
);

CREATE TABLE shows (
  media_item_id TEXT PRIMARY KEY,
  first_air_date TEXT,
  last_air_date TEXT,
  season_count INTEGER NOT NULL DEFAULT 0,
  episode_count INTEGER NOT NULL DEFAULT 0,
  in_production INTEGER NOT NULL DEFAULT 0,
  next_episode_air_date TEXT,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  air_date TEXT,
  episode_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES media_items(id) ON DELETE CASCADE,
  UNIQUE (show_id, season_number)
);

CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  tmdb_id INTEGER,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  still_path TEXT,
  air_date TEXT,
  runtime_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  UNIQUE (show_id, season_number, episode_number)
);

CREATE TABLE user_media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped')),
  is_favorite INTEGER NOT NULL DEFAULT 0,
  current_episode_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (current_episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
  UNIQUE (user_id, media_item_id)
);

CREATE TABLE watchlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, name)
);

CREATE TABLE watchlist_items (
  id TEXT PRIMARY KEY,
  watchlist_id TEXT NOT NULL,
  media_item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  UNIQUE (watchlist_id, media_item_id)
);

CREATE TABLE watch_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_item_id TEXT NOT NULL,
  episode_id TEXT,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 1,
  rewatch_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE (user_id, media_item_id, episode_id)
);

CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_item_id TEXT NOT NULL,
  episode_id TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
  UNIQUE (user_id, media_item_id, episode_id)
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_item_id TEXT NOT NULL,
  episode_id TEXT,
  body TEXT NOT NULL,
  contains_spoilers INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE friendships (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX idx_email_login_email_expires ON email_login_challenges(email, expires_at);
CREATE INDEX idx_media_type_title ON media_items(media_type, title);
CREATE INDEX idx_media_type_tmdb ON media_items(media_type, tmdb_id);
CREATE INDEX idx_media_popularity ON media_items(media_type, popularity DESC);
CREATE INDEX idx_seasons_show_number ON seasons(show_id, season_number);
CREATE INDEX idx_episodes_show_air_date ON episodes(show_id, air_date);
CREATE INDEX idx_episodes_season_number ON episodes(season_id, episode_number);
CREATE INDEX idx_user_media_user_status ON user_media(user_id, status, updated_at DESC);
CREATE INDEX idx_watchlists_user ON watchlists(user_id);
CREATE INDEX idx_watchlist_items_list_order ON watchlist_items(watchlist_id, sort_order, added_at DESC);
CREATE INDEX idx_watch_history_user_time ON watch_history(user_id, watched_at DESC);
CREATE INDEX idx_watch_history_user_media ON watch_history(user_id, media_item_id);
CREATE UNIQUE INDEX idx_watch_history_user_movie_unique ON watch_history(user_id, media_item_id) WHERE episode_id IS NULL;
CREATE INDEX idx_ratings_media ON ratings(media_item_id, episode_id);
CREATE UNIQUE INDEX idx_ratings_user_media_unique ON ratings(user_id, media_item_id) WHERE episode_id IS NULL;
CREATE INDEX idx_reviews_media_time ON reviews(media_item_id, episode_id, created_at DESC);
CREATE INDEX idx_reviews_user_time ON reviews(user_id, created_at DESC);
CREATE INDEX idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee_status ON friendships(addressee_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at, created_at DESC);
