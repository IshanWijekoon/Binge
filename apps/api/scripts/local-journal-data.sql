PRAGMA foreign_keys = OFF;
DELETE FROM journal_episodes;
DELETE FROM journal_reviews;
DELETE FROM journal_notes;
DELETE FROM journal_ratings;
DELETE FROM journal_shows;
DELETE FROM admin_sessions;
PRAGMA foreign_keys = ON;
