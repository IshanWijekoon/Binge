import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { API_ROOT, ENV_PATH, loadEnv } from "./load-env.mjs";

if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}`);
  process.exit(1);
}

const password = loadEnv().ADMIN_PASSWORD;
if (!password) {
  console.error("ADMIN_PASSWORD is empty in .env");
  process.exit(1);
}

const result = spawnSync("node", ["scripts/hash-password.mjs"], {
  cwd: API_ROOT,
  env: { ...process.env, ADMIN_PASSWORD: password },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
