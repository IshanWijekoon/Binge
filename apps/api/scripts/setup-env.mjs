import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_ROOT, ENV_PATH, loadEnv } from "./load-env.mjs";
import { hashPassword } from "./hash-password.mjs";

if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}. Create it from .env.example first.`);
  process.exit(1);
}

const password = loadEnv().ADMIN_PASSWORD;
if (!password) {
  console.error("ADMIN_PASSWORD is empty in .env");
  process.exit(1);
}

const hash = await hashPassword(password);
const devVarsPath = join(API_ROOT, ".dev.vars");
const existing = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
const lines = existing
  .split(/\r?\n/u)
  .filter((line) => line.trim() && !line.trim().startsWith("ADMIN_PASSWORD_HASH="));

lines.push(`ADMIN_PASSWORD_HASH=${hash}`);
writeFileSync(devVarsPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Updated ${devVarsPath} with ADMIN_PASSWORD_HASH from .env`);
