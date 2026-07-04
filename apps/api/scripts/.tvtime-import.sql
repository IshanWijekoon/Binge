INSERT INTO journal_shows (
    id, provider, provider_show_id, status, sort_order, show_name_snapshot, summary_snapshot, image_snapshot,
    premiered_snapshot, next_episode_air_date, metadata_refreshed_at, current_season, current_episode, progress_updated_at
  ) VALUES (
    'tvmaze:show:472',
    'tvmaze',
    'tvmaze:show:472',
    'watching',
    8,
    'X-Men',
    'With stories adapted directly from the original comic books, this show is a piece of Marvel history and a must-have for every X-Men fan. Discover the origins of your favorite characters and uncover the secrets of Magneto and more of the world''s most diabolical villains in X-Men.Due to budget issues and issues with animation production deadlines not been met most episodes from Season 3 onwards aired out of production order, leading to some storylines not making any sense and creating plot holes, however this was somewhat rectified later with the DVD and streaming releases.',
    'https://static.tvmaze.com/uploads/images/medium_portrait/305/764844.jpg',
    '1992-10-31',
    NULL,
    '2026-07-04T12:56:27.205Z',
    1,
    1,
    '2026-07-04T12:56:27.205Z'
  )
  ON CONFLICT(provider_show_id) DO UPDATE SET
    status = excluded.status,
    sort_order = excluded.sort_order,
    show_name_snapshot = excluded.show_name_snapshot,
    summary_snapshot = excluded.summary_snapshot,
    image_snapshot = excluded.image_snapshot,
    premiered_snapshot = excluded.premiered_snapshot,
    metadata_refreshed_at = excluded.metadata_refreshed_at,
    current_season = excluded.current_season,
    current_episode = excluded.current_episode,
    progress_updated_at = excluded.progress_updated_at,
    updated_at = CURRENT_TIMESTAMP;