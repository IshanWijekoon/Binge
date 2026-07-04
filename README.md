# Binge

A personal TV journal to track what you're watching, what's next, and your progress across hundreds of shows.

## Fork and run your own

This project is **open for anyone to fork, modify, and deploy as their own TV journal**. You can rebrand it, point it at your own Cloudflare account, and track your own library.

1. **Fork** this repository on GitHub
2. **Clone** your fork and install dependencies: `npm install`
3. **Configure** your own Cloudflare D1 database, KV namespace, and Worker in `apps/api/wrangler.jsonc`
4. **Set secrets** — copy `apps/api/.env.example` to `apps/api/.env` and choose a strong `ADMIN_PASSWORD`
5. **Migrate** — `cd apps/api && npm run db:migrate:remote`
6. **Deploy** — `npm run deploy:safe` (API) and `npm run pages:deploy` (web)
7. **Customize** — replace `apps/web/public/logo.png`, update site title in `apps/web/app/layout.tsx`, and change the workspace path in `apps/web/lib/admin-path.ts` if you want a private admin URL

No permission needed beyond the [MIT License](./LICENSE). Credit is appreciated but not required.

## Features

- **Home feed** — continue watching, upcoming episodes, recently added and finished shows
- **Library** — browse shows with status filters (watching, completed, plan to watch, on hold)
- **Show pages** — episode lists, progress, reviews, and ratings
- **Calendar** — upcoming air dates for shows you're watching
- **Stats** — hours watched, episodes completed, top genres and networks
- **Private workspace** — password-protected journal management (not linked from the public site)

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, Tailwind CSS, TanStack Query |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 |
| Cache | Cloudflare KV |
| TV metadata | TVMaze API |

## Project structure

```text
apps/
  api/    Cloudflare Workers API
  web/    Next.js static frontend (Cloudflare Pages)
```

## Local development

**Prerequisites:** Node.js 20+, Cloudflare account (for remote API/D1)

```bash
npm install

# API — create apps/api/.env from .env.example, then:
cd apps/api
npm run setup:env      # sync password hash to .dev.vars
npm run db:migrate:local
npm run dev

# Web (separate terminal)
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The web app proxies API requests to the Worker in dev.

## Deploy your instance

```bash
# API (requires apps/api/.env with ADMIN_PASSWORD)
cd apps/api
npm run deploy:safe

# Web — set your domain in Cloudflare Pages; update ALLOWED_ORIGINS in wrangler.jsonc
cd apps/web
npm run pages:deploy
```

## Documentation

- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) — architecture and implementation overview
- [QA_REPORT.md](./QA_REPORT.md) — quality assurance review
- [SECURITY_REPORT.md](./SECURITY_REPORT.md) — security analysis

## License

[MIT](./LICENSE) — free to use, modify, and distribute. See the license file for full terms.
