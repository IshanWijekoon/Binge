/**
 * Creates the CNAME for binge.ishanmadusanka.dev → binge-web-d0o.pages.dev
 *
 * Requires a Cloudflare API token with Zone:DNS:Edit for ishanmadusanka.dev
 * Create at: https://dash.cloudflare.com/profile/api-tokens
 * (Use "Edit zone DNS" template, scope to ishanmadusanka.dev)
 *
 * Usage:
 *   set CLOUDFLARE_API_TOKEN=your-token
 *   node scripts/setup-custom-domain.mjs
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const accountId = "d1e88c3b8ef4d2fd63a29286331cdd6a";
const zoneId = "481403d38104ef2c2435436b0bc3dfc2";
const pagesProject = "binge-web";
const customDomain = "binge.ishanmadusanka.dev";
const subdomain = "binge";
const dnsTarget = "binge-web-d0o.pages.dev";

const token =
  process.env.CLOUDFLARE_API_TOKEN ??
  readFileSync(join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"), "utf8").match(
    /oauth_token = "([^"]+)"/,
  )?.[1];

if (!token) {
  console.error("Set CLOUDFLARE_API_TOKEN (needs Zone:DNS:Edit). Wrangler OAuth cannot create DNS records.");
  process.exit(1);
}

async function api(method, path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { ok: data.success, data };
}

const zone = await api("GET", `/zones/${zoneId}`);
if (!zone.ok) {
  console.error("Zone check failed:", zone.data.errors);
  process.exit(1);
}
console.log(`Zone: ${zone.data.result.name} (${zone.data.result.status})`);

const fqdn = `${subdomain}.${zone.data.result.name}`;
const existing = await api("GET", `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(fqdn)}`);
const records = existing.data.result ?? [];

for (const record of records) {
  if (record.content !== dnsTarget || !record.proxied) {
    const updated = await api("PATCH", `/zones/${zoneId}/dns_records/${record.id}`, {
      type: "CNAME",
      name: subdomain,
      content: dnsTarget,
      proxied: true,
      ttl: 1,
    });
    if (!updated.ok) {
      console.error("Failed to update CNAME:", updated.data.errors);
      process.exit(1);
    }
    console.log(`Updated CNAME ${fqdn} -> ${dnsTarget} (proxied)`);
  } else {
    console.log(`CNAME already correct: ${fqdn} -> ${dnsTarget}`);
  }
}

if (!records.length) {
  const created = await api("POST", `/zones/${zoneId}/dns_records`, {
    type: "CNAME",
    name: subdomain,
    content: dnsTarget,
    proxied: true,
    ttl: 1,
  });
  if (!created.ok) {
    console.error("Failed to create CNAME:", created.data.errors);
    console.error("\nManual fix: Cloudflare Dashboard -> DNS -> Add record:");
    console.error(`  Type: CNAME | Name: ${subdomain} | Target: ${dnsTarget} | Proxy: ON`);
    process.exit(1);
  }
  console.log(`Created CNAME ${fqdn} -> ${dnsTarget} (proxied)`);
}

const domains = await api("GET", `/accounts/${accountId}/pages/projects/${pagesProject}/domains`);
const entry = (domains.data.result ?? []).find((d) => d.name === customDomain);
if (!entry) {
  const added = await api("POST", `/accounts/${accountId}/pages/projects/${pagesProject}/domains`, { name: customDomain });
  console.log(added.ok ? `Attached Pages domain ${customDomain}` : "Pages domain attach:", added.data.errors);
} else {
  console.log(`Pages domain status: ${entry.status} (${entry.verification_data?.error_message ?? "ok"})`);
}

console.log("\nDone. Wait 2-5 minutes, then open https://binge.ishanmadusanka.dev");
