import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = join(__dirname, "..");
const backupPath = join(API_ROOT, "scripts", "remote-d1-backup.sql");
const outputPath = join(API_ROOT, "scripts", "local-journal-data.sql");
const useCachedBackup = process.argv.includes("--cached");

function run(command, args) {
  execFileSync(command, args, {
    cwd: API_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

if (!useCachedBackup || !existsSync(backupPath)) {
  console.log("Exporting remote D1 backup...");
  run("npx", ["wrangler", "d1", "export", "binge", "--remote", "--output", backupPath]);
}

const backup = readFileSync(backupPath, "utf8");
const inserts = backup
  .split("\n")
  .filter((line) => line.startsWith('INSERT INTO "journal_shows"'));

if (inserts.length === 0) {
  console.error("No journal_shows rows found in backup.");
  process.exit(1);
}

writeFileSync(
  outputPath,
  [
    "PRAGMA foreign_keys = OFF;",
    "DELETE FROM journal_episodes;",
    "DELETE FROM journal_reviews;",
    "DELETE FROM journal_notes;",
    "DELETE FROM journal_ratings;",
    "DELETE FROM journal_shows;",
    ...inserts,
    "PRAGMA foreign_keys = ON;",
  ].join("\n"),
);

console.log(`Importing ${inserts.length} journal shows into local D1...`);
run("npx", ["wrangler", "d1", "execute", "binge", "--local", "--file", outputPath]);
console.log("Local D1 is ready. Refresh http://localhost:3000");
