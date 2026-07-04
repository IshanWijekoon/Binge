PRAGMA foreign_keys = ON;

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_shows (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'tvmaze',
  provider_show_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('watching', 'completed', 'plan-to-watch', 'on-hold', 'dropped')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  show_name_snapshot TEXT NOT NULL,
  summary_snapshot TEXT,
  image_snapshot TEXT,
  premiered_snapshot TEXT,
  next_episode_air_date TEXT,
  metadata_refreshed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_episodes (
  id TEXT PRIMARY KEY,
  journal_show_id TEXT NOT NULL,
  provider_episode_id TEXT NOT NULL UNIQUE,
  show_name_snapshot TEXT NOT NULL,
  episode_name_snapshot TEXT NOT NULL,
  season_number_snapshot INTEGER,
  episode_number_snapshot INTEGER,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_show_id) REFERENCES journal_shows(id) ON DELETE CASCADE
);

CREATE TABLE journal_reviews (
  id TEXT PRIMARY KEY,
  journal_show_id TEXT NOT NULL UNIQUE,
  show_name_snapshot TEXT NOT NULL,
  body TEXT NOT NULL,
  contains_spoilers INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_show_id) REFERENCES journal_shows(id) ON DELETE CASCADE
);

CREATE TABLE journal_notes (
  id TEXT PRIMARY KEY,
  journal_show_id TEXT NOT NULL UNIQUE,
  show_name_snapshot TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_show_id) REFERENCES journal_shows(id) ON DELETE CASCADE
);

CREATE TABLE journal_ratings (
  id TEXT PRIMARY KEY,
  journal_show_id TEXT NOT NULL UNIQUE,
  show_name_snapshot TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_show_id) REFERENCES journal_shows(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at, revoked_at);
CREATE INDEX idx_journal_shows_status_sort ON journal_shows(status, sort_order, created_at DESC);
CREATE INDEX idx_journal_shows_provider ON journal_shows(provider, provider_show_id);
CREATE INDEX idx_journal_episodes_show_time ON journal_episodes(journal_show_id, watched_at DESC);
CREATE INDEX idx_journal_reviews_time ON journal_reviews(updated_at DESC, created_at DESC);
CREATE INDEX idx_journal_notes_time ON journal_notes(updated_at DESC, created_at DESC);
CREATE INDEX idx_journal_ratings_time ON journal_ratings(updated_at DESC, created_at DESC);
