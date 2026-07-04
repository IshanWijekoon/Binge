-- Add progress tracking columns to journal_shows
ALTER TABLE journal_shows ADD COLUMN current_season INTEGER DEFAULT 1;
ALTER TABLE journal_shows ADD COLUMN current_episode INTEGER DEFAULT 0;
ALTER TABLE journal_shows ADD COLUMN progress_updated_at TEXT;
