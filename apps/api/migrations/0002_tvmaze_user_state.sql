CREATE TABLE followed_shows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'tvmaze',
  provider_show_id TEXT NOT NULL,
  show_name_snapshot TEXT,
  image_snapshot TEXT,
  followed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, provider, provider_show_id)
);

CREATE TABLE episode_watch_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'tvmaze',
  provider_show_id TEXT NOT NULL,
  provider_episode_id TEXT NOT NULL,
  show_name_snapshot TEXT,
  episode_name_snapshot TEXT,
  season_number_snapshot INTEGER,
  episode_number_snapshot INTEGER,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, provider, provider_episode_id)
);

CREATE INDEX idx_followed_shows_user ON followed_shows(user_id, followed_at DESC);
CREATE INDEX idx_episode_watch_history_user ON episode_watch_history(user_id, watched_at DESC);
CREATE INDEX idx_episode_watch_history_show ON episode_watch_history(user_id, provider_show_id, watched_at DESC);
