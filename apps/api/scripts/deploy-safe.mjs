import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { API_ROOT, ENV_PATH, loadEnv } from "./load-env.mjs";

if (!existsSync(ENV_PATH)) {
  console.error(`Deploy aborted: missing ${ENV_PATH}`);
  console.error("Create apps/api/.env from .env.example and set ADMIN_PASSWORD first.");
  process.exit(1);
}

if (!loadEnv().ADMIN_PASSWORD) {
  console.error("Deploy aborted: ADMIN_PASSWORD is empty in .env");
  process.exit(1);
}

const setSecret = spawnSync("node", ["scripts/admin-set-secret.mjs"], {
  cwd: API_ROOT,
  stdio: "inherit",
  shell: true,
});

if (setSecret.status !== 0) {
  process.exit(setSecret.status ?? 1);
}

const deploy = spawnSync("npx", ["wrangler", "deploy"], {
  cwd: API_ROOT,
  stdio: "inherit",
  shell: true,
});

process.exit(deploy.status ?? 1);
