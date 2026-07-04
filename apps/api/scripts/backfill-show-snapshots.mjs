import { execSync } from "node:child_process";
import { mkdtempSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const TVMAZE_BASE = "https://api.tvmaze.com";
const BATCH_SIZE = 10;
const DELAY_MS = 250;
const target = process.argv.includes("--local") ? "local" : "remote";

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function runD1Command(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const command = `npx wrangler d1 execute binge --${target} --json --command "${escaped}"`;
  return execSync(command, {
    cwd: API_ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  });
}

function runD1File(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), "binge-backfill-"));
  const sqlPath = join(tempDir, "query.sql");
  writeFileSync(sqlPath, sql, "utf8");

  try {
    const command = `npx wrangler d1 execute binge --${target} --json --file "${sqlPath}"`;
    return execSync(command, {
      cwd: API_ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      shell: true,
    });
  } finally {
    try {
      unlinkSync(sqlPath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}

function parseSelectResults(output) {
  try {
    const parsed = JSON.parse(output.trim());
    const entry = Array.isArray(parsed) ? parsed[0] : parsed;
    const results = entry?.results ?? [];
    if (results[0]?.count !== undefined || results[0]?.id !== undefined) {
      return results;
    }
    return [];
  } catch {
    return [];
  }
}

function escapeSql(value) {
  return String(value).replace(/'/gu, "''");
}

function toTvmazeShowId(showId) {
  const prefix = "tvmaze:show:";
  const raw = showId.startsWith(prefix) ? showId.slice(prefix.length) : showId;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid show id: ${showId}`);
  }
  return parsed;
}

async function fetchEpisodes(providerShowId) {
  const tvmazeId = toTvmazeShowId(providerShowId);
  const response = await fetch(`${TVMAZE_BASE}/shows/${tvmazeId}/episodes`);
  if (!response.ok) {
    throw new Error(`TVMaze ${response.status} for show ${providerShowId}`);
  }
  return response.json();
}

async function main() {
  const rows = parseSelectResults(
    runD1Command("SELECT id, provider_show_id, show_name_snapshot FROM journal_shows ORDER BY sort_order ASC"),
  );

  console.log(`Backfilling ${rows.length} shows on ${target} D1...`);

  let updated = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const episodes = await fetchEpisodes(row.provider_show_id);
          const totalEpisodes = episodes.length;
          const totalRuntimeMinutes = episodes.reduce((sum, episode) => sum + (episode.runtime ?? 45), 0);
          runD1File(
            `UPDATE journal_shows SET total_episodes_snapshot = ${totalEpisodes}, total_runtime_minutes_snapshot = ${totalRuntimeMinutes}, updated_at = CURRENT_TIMESTAMP WHERE id = '${escapeSql(row.id)}';`,
          );
          updated += 1;
          console.log(`[${updated}/${rows.length}] ${row.show_name_snapshot}`);
        } catch (error) {
          console.error(`Failed ${row.show_name_snapshot}: ${error.message}`);
        }
      }),
    );
    await sleep(DELAY_MS);
  }

  console.log(`Done. Updated ${updated}/${rows.length} shows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
