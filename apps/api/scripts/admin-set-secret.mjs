import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { API_ROOT, ENV_PATH, loadEnv } from "./load-env.mjs";
import { hashPassword } from "./hash-password.mjs";

if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}. Create it from .env.example before deploying.`);
  process.exit(1);
}

const password = loadEnv().ADMIN_PASSWORD;
if (!password) {
  console.error("ADMIN_PASSWORD is empty in .env");
  process.exit(1);
}

const hash = await hashPassword(password);
const result = spawnSync(
  "npx",
  ["wrangler", "secret", "put", "ADMIN_PASSWORD_HASH"],
  {
    cwd: API_ROOT,
    input: hash,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "inherit", "inherit"],
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("ADMIN_PASSWORD_HASH secret updated.");
