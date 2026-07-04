import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const TVMAZE_BASE = "https://api.tvmaze.com";
const CACHE_PATH = join(API_ROOT, "scripts", ".tvtime-tvmaze-cache.json");
const DELAY_MS = 220;

const dataDirArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
const dataDir = dataDirArg ? resolve(dataDirArg) : null;
const target = process.argv.includes("--local") ? "local" : "remote";
const retryFailuresOnly = process.argv.includes("--retry-failures");

if (!dataDir) {
  console.error("Usage: node scripts/import-tvtime.mjs <path-to-tvtime-gdpr-export> [--local] [--retry-failures]");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function readCsv(fileName) {
  const path = join(dataDir, fileName);
  const lines = readFileSync(path, "utf8").replace(/\r/g, "").split("\n").filter(Boolean);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

function parseProgressMap(line) {
  const season = line.match(/s_no:(\d+)/)?.[1];
  const episode = line.match(/ep_no:(\d+)/)?.[1];
  return {
    season: season ? Number.parseInt(season, 10) : null,
    episode: episode ? Number.parseInt(episode, 10) : null,
  };
}

function parseTrackingRows(rows) {
  const byShowId = new Map();
  for (const row of rows) {
    if (!row.key?.startsWith("user-series-")) continue;
    const showId = row.s_id;
    if (!showId) continue;
    const progress = parseProgressMap(row.most_recent_ep_watched ?? "");
    const epWatchCount = row.ep_watch_count ? Number.parseInt(row.ep_watch_count, 10) : null;
    byShowId.set(showId, {
      epWatchCount: Number.isInteger(epWatchCount) ? epWatchCount : null,
      isForLater: row.is_for_later === "true",
      isArchived: row.is_archived === "true",
      season: progress.season,
      episode: progress.episode,
      updatedAt: row.updated_at || row.created_at || null,
    });
  }
  return byShowId;
}

function loadShows() {
  const followed = readCsv("followed_tv_show.csv");
  const userData = readCsv("user_tv_show_data.csv");
  const tracking = readCsv("tracking-prod-records-v2.csv");
  const trackingByShowId = parseTrackingRows(tracking);

  const episodesSeenByShowId = new Map(
    userData.map((row) => [row.tv_show_id, Number.parseInt(row.nb_episodes_seen, 10) || 0]),
  );

  return followed
    .map((row, index) => {
      const trackingInfo = trackingByShowId.get(row.tv_show_id) ?? {};
      const episodesSeen = episodesSeenByShowId.get(row.tv_show_id) ?? 0;
      return {
        tvShowId: row.tv_show_id,
        name: row.tv_show_name?.trim() || `TV Time show ${row.tv_show_id}`,
        archived: row.archived === "1",
        createdAt: row.created_at,
        sortOrder: index,
        episodesSeen,
        epWatchCount: trackingInfo.epWatchCount ?? episodesSeen,
        isForLater: trackingInfo.isForLater ?? false,
        isArchived: trackingInfo.isArchived ?? false,
        season: trackingInfo.season ?? (episodesSeen > 0 ? 1 : 0),
        episode: trackingInfo.episode ?? (episodesSeen > 0 ? 0 : 0),
      };
    })
    .filter((show) => show.name);
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
}

function saveCache(cache) {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function searchQueries(name) {
  const queries = new Set([name.trim()]);
  const withoutYear = name.replace(/\s*\(\d{4}\)\s*$/u, "").trim();
  if (withoutYear) queries.add(withoutYear);
  const withoutRegion = withoutYear.replace(/\s*\((US|UK)\)\s*$/iu, "").trim();
  if (withoutRegion) queries.add(withoutRegion);
  const withoutYearOrRegion = name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  if (withoutYearOrRegion) queries.add(withoutYearOrRegion);
  return [...queries];
}

async function fetchSearchResults(query) {
  const response = await fetch(`${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  const results = await response.json();
  return Array.isArray(results) ? results : [];
}

async function fetchSingleResult(query) {
  const response = await fetch(`${TVMAZE_BASE}/singlesearch/shows?q=${encodeURIComponent(query)}`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const show = await response.json();
  return show?.id ? { score: 1, show } : null;
}

function pickSearchResult(name, results) {
  if (!results.length) return null;
  const normalizedName = name.toLowerCase().replace(/\s+/g, " ");
  const exact = results.find((item) => item.show?.name?.toLowerCase().replace(/\s+/g, " ") === normalizedName);
  return exact ?? results[0];
}

async function lookupByTheTvDb(tvShowId, cache) {
  const cacheKey = `thetvdb:${tvShowId}`;
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const response = await fetch(`${TVMAZE_BASE}/lookup/shows?thetvdb=${encodeURIComponent(tvShowId)}`);
  await sleep(DELAY_MS);
  if (!response.ok) {
    cache[cacheKey] = null;
    return null;
  }
  const show = await response.json();
  if (!show?.id) {
    cache[cacheKey] = null;
    return null;
  }

  const mapped = {
    id: show.id,
    providerShowId: `tvmaze:show:${show.id}`,
    name: show.name,
    summary: show.summary ? stripHtml(show.summary) : null,
    image: show.image?.medium ?? show.image?.original ?? null,
    premiered: show.premiered ?? null,
    status: show.status ?? null,
  };
  cache[cacheKey] = mapped;
  return mapped;
}

async function searchTvmaze(name, tvShowId, cache) {
  const cacheKey = name.toLowerCase();
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const byTvdb = await lookupByTheTvDb(tvShowId, cache);
  if (byTvdb) {
    cache[cacheKey] = byTvdb;
    return byTvdb;
  }

  for (const query of searchQueries(name)) {
    const results = await fetchSearchResults(query);
    await sleep(DELAY_MS);
    const picked = pickSearchResult(query, results);
    if (picked?.show) {
      const show = picked.show;
      const mapped = {
        id: show.id,
        providerShowId: `tvmaze:show:${show.id}`,
        name: show.name,
        summary: show.summary ? stripHtml(show.summary) : null,
        image: show.image?.medium ?? show.image?.original ?? null,
        premiered: show.premiered ?? null,
        status: show.status ?? null,
      };
      cache[cacheKey] = mapped;
      return mapped;
    }

    const single = await fetchSingleResult(query);
    await sleep(DELAY_MS);
    if (single?.show) {
      const show = single.show;
      const mapped = {
        id: show.id,
        providerShowId: `tvmaze:show:${show.id}`,
        name: show.name,
        summary: show.summary ? stripHtml(show.summary) : null,
        image: show.image?.medium ?? show.image?.original ?? null,
        premiered: show.premiered ?? null,
        status: show.status ?? null,
      };
      cache[cacheKey] = mapped;
      return mapped;
    }
  }

  cache[cacheKey] = null;
  return null;
}

async function fetchEpisodeCount(tvmazeShowId, cache) {
  const cacheKey = `episodes:${tvmazeShowId}`;
  if (cache[cacheKey] !== undefined) return cache[cacheKey];

  const response = await fetch(`${TVMAZE_BASE}/shows/${tvmazeShowId}/episodes`);
  if (!response.ok) {
    cache[cacheKey] = null;
    return null;
  }
  const episodes = await response.json();
  const count = Array.isArray(episodes) ? episodes.length : null;
  cache[cacheKey] = count;
  await sleep(DELAY_MS);
  return count;
}

function resolveStatus(show, tvmaze, episodeCount) {
  if (show.archived || show.isArchived) return "dropped";
  if (show.isForLater || show.episodesSeen === 0) return "plan-to-watch";

  const watched = Math.max(show.epWatchCount ?? 0, show.episodesSeen);
  const ended = tvmaze.status === "Ended";
  if (ended && episodeCount && watched >= episodeCount) return "completed";
  if (watched > 0) return "watching";
  return "plan-to-watch";
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsert(show, tvmaze, status) {
  const now = new Date().toISOString();
  const currentSeason = show.season && show.season > 0 ? show.season : status === "plan-to-watch" ? 1 : 1;
  const currentEpisode = show.episode && show.episode >= 0 ? show.episode : 0;

  return `INSERT INTO journal_shows (
    id, provider, provider_show_id, status, sort_order, show_name_snapshot, summary_snapshot, image_snapshot,
    premiered_snapshot, next_episode_air_date, metadata_refreshed_at, current_season, current_episode, progress_updated_at
  ) VALUES (
    ${sqlValue(tvmaze.providerShowId)},
    'tvmaze',
    ${sqlValue(tvmaze.providerShowId)},
    ${sqlValue(status)},
    ${show.sortOrder},
    ${sqlValue(tvmaze.name)},
    ${sqlValue(tvmaze.summary)},
    ${sqlValue(tvmaze.image)},
    ${sqlValue(tvmaze.premiered)},
    NULL,
    ${sqlValue(now)},
    ${currentSeason},
    ${currentEpisode},
    ${sqlValue(now)}
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
    updated_at = CURRENT_TIMESTAMP;`;
}

async function main() {
  console.log(`Importing TV Time data from ${dataDir} into ${target} D1...`);
  let shows = loadShows();
  if (retryFailuresOnly) {
    const reportPath = join(API_ROOT, "scripts", ".tvtime-import-report.json");
    if (!existsSync(reportPath)) {
      console.error("No previous import report found.");
      process.exit(1);
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const failedIds = new Set(report.failures.map((item) => item.tvShowId));
    shows = shows.filter((show) => failedIds.has(show.tvShowId));
    console.log(`Retrying ${shows.length} previously failed shows...`);
  }
  const cache = loadCache();
  if (retryFailuresOnly) {
    for (const show of shows) {
      delete cache[show.name.toLowerCase()];
    }
  }
  const statements = [];
  const failures = [];
  const imported = [];

  for (const show of shows) {
    try {
      const tvmaze = await searchTvmaze(show.name, show.tvShowId, cache);
      if (!tvmaze) {
        failures.push({ name: show.name, tvShowId: show.tvShowId, reason: "No TVMaze match" });
        continue;
      }

      const episodeCount = await fetchEpisodeCount(tvmaze.id, cache);
      const status = resolveStatus(show, tvmaze, episodeCount);
      statements.push(buildInsert(show, tvmaze, status));
      imported.push({ name: show.name, status, tvmazeId: tvmaze.id, episodesSeen: show.episodesSeen });
      console.log(`[${imported.length}/${shows.length}] ${show.name} -> ${tvmaze.name} (${status})`);
    } catch (error) {
      failures.push({
        name: show.name,
        tvShowId: show.tvShowId,
        reason: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed: ${show.name} - ${failures.at(-1)?.reason}`);
    }
  }

  saveCache(cache);

  if (statements.length === 0) {
    console.error("No shows prepared for import.");
    process.exit(1);
  }

  const sqlPath = join(API_ROOT, "scripts", ".tvtime-import.sql");
  writeFileSync(sqlPath, statements.join("\n"));
  console.log(`Executing ${statements.length} upserts against ${target} D1...`);

  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "binge", `--${target}`, "--file", sqlPath],
    { cwd: API_ROOT, stdio: "inherit", shell: process.platform === "win32" },
  );

  const reportPath = join(API_ROOT, "scripts", ".tvtime-import-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        imported: imported.length,
        failed: failures.length,
        total: shows.length,
        failures,
        shows: imported,
      },
      null,
      2,
    ),
  );

  console.log(`Done. Imported ${imported.length}/${shows.length} shows.`);
  if (failures.length) {
    console.log(`${failures.length} shows could not be matched. See ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
