# Binge Project Documentation

This document summarizes all work completed so far across product, architecture, database, UI/UX, backend, and frontend phases.

## Phase 1: Product Requirements Document

The product was defined as an original premium entertainment tracking platform, not a clone of TV Time.

The PRD covered:

- Vision
- Target audience
- User personas
- Features
- User stories
- Functional requirements
- Non-functional requirements
- Success metrics
- MVP scope

Primary product goals:

- Track TV shows
- Track movies
- Manage watchlists
- Track episode progress
- Show upcoming episodes
- Provide recommendations
- Show statistics
- Support friends and social discovery
- Support reviews and ratings
- Send notifications

## Phase 2: System Architecture

The complete system architecture was designed around the requested stack.

Technology choices:

- Frontend: Next.js
- Backend: Cloudflare Workers
- Database: Cloudflare D1
- Cache: Cloudflare KV
- Storage: Cloudflare R2
- Authentication: Google OAuth and email login
- External API: TMDb

Architecture deliverables included:

- Architecture diagrams
- Logical service layout
- Folder structure
- REST API design
- Data flow
- Security design
- Scalability strategy
- Cost estimation

Key architecture decisions:

- Cloudflare D1 is the source of truth for relational application data.
- Cloudflare KV is used for cache, rate limiting, OAuth state, and short-lived metadata.
- Cloudflare R2 is used for user-uploaded or generated assets such as avatars.
- TMDb is accessed from the backend only.
- Cloudflare Workers own backend API logic and secrets.
- Next.js owns presentation, interaction, and responsive user experience.

## Phase 3: Database Design

A production-ready Cloudflare D1 / SQLite-compatible relational database was designed.

The database design covered:

- ER diagram
- Normalization
- Indexes
- SQL schema
- Migration strategy

Main database areas:

- Users
- Auth identities
- Sessions
- Email login challenges
- Media items
- Shows
- Seasons
- Episodes
- User media tracking
- Watchlists
- Watchlist items
- Watch history
- Ratings
- Reviews
- Friendships
- Notifications

Important database decisions:

- A normalized `media_items` table represents both movies and shows.
- Show-specific data is split into `shows`, `seasons`, and `episodes`.
- User-specific tracking state is separated from catalog metadata.
- Reviews and ratings are stored separately.
- Notifications are stored independently from the event that created them.
- High-traffic queries are indexed, including library, watchlist, notifications, reviews, ratings, and watch history.

## Phase 4: UI/UX Design

A premium, mobile-first, dark-mode UI/UX direction was documented.

The design documentation covered:

- Design system
- Typography
- Spacing
- Colors
- Components
- Page wireframes
- Interaction patterns
- Accessibility guidance

Design direction:

- Dark and cinematic
- Modern
- Mobile first
- Simple
- Content-led
- Premium but restrained

Designed screens:

- Home
- Search / Discover
- Show detail
- Movie detail
- Watchlist
- Stats
- Friends
- Profile
- Notifications

Core interaction patterns:

- One-tap watched state
- Save to watchlist
- Episode progress tracking
- Spoiler protection
- Recommendation feedback
- Notification grouping
- Useful empty states
- Skeleton loading states

## Phase 5: Backend Implementation

The backend was implemented under:

```text
apps/api
```

No frontend files were touched during backend implementation.

Backend stack:

- Cloudflare Workers
- TypeScript
- Cloudflare D1
- Cloudflare KV
- Cloudflare R2
- REST API
- Google OAuth
- Email login

Backend folder structure:

```text
apps/api/
  src/
    application/
    domain/
    infrastructure/
      http/
      repositories/
      security/
      services/
      storage/
    shared/
  migrations/
```

Implemented backend capabilities:

- Cloudflare Worker entrypoint
- REST router
- CORS handling
- Structured error handling
- Request validation
- KV-backed rate limiting
- Google OAuth login
- Email code login
- Secure session cookies
- Session token hashing
- Email code hashing
- User profile API
- Catalog search through TMDb
- TMDb trending
- TMDb media sync
- Show season and episode sync
- User library tracking
- Movie watched tracking
- Episode watched tracking
- Watchlists
- Ratings
- Reviews
- Friends
- Notifications
- Stats
- R2 avatar upload
- R2 asset serving
- D1 migration schema

Backend validation completed:

```text
npm run typecheck
npx wrangler d1 migrations apply binge --local
```

Backend diagnostics:

- TypeScript passed.
- Local D1 migration applied successfully.
- IDE diagnostics reported no linter errors.

Backend setup notes:

- `apps/api/wrangler.jsonc` currently contains placeholder Cloudflare resource IDs.
- Real D1, KV, and R2 resource IDs must be configured before remote deployment.
- Required secrets must be set through Cloudflare/Wrangler:
  - `SESSION_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `TMDB_API_TOKEN`
  - `EMAIL_PROVIDER_URL`
  - `EMAIL_PROVIDER_API_KEY`
  - `EMAIL_FROM`

## Phase 6: Frontend Implementation

The frontend was implemented under:

```text
apps/web
```

No backend files were modified during frontend implementation.

Frontend stack:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn-style UI components
- Responsive design
- Dark mode

Frontend folder structure:

```text
apps/web/
  app/
  components/
    features/
    ui/
  lib/
  public/
```

Implemented frontend capabilities:

- Next.js App Router setup
- Global dark theme
- Tailwind v4 setup
- shadcn-style component foundation
- Typed API client matching the backend contract
- Auth screen
- Google login link
- Email login code flow
- Main app shell
- Desktop sidebar navigation
- Mobile bottom navigation
- Home dashboard
- Discover/search screen
- Trending shows and movies
- Watchlist screen
- Stats screen
- Profile screen
- Media cards
- Save to watchlist action
- Mark watched action
- Catalog sync before tracking
- Notification count display

Frontend UI components added:

- `Button`
- `Card`
- `Badge`
- `Input`
- `Tabs`
- `Avatar`
- `MediaCard`
- `BingeApp`

Frontend API client:

- Centralized in `apps/web/lib/api.ts`
- Uses the backend contract under `/api/v1`
- Defaults to:

```text
http://localhost:8787/api/v1
```

Frontend environment example:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/api/v1
```

Frontend validation completed:

```text
npm run typecheck
npm run lint
npm run build
```

Frontend diagnostics:

- TypeScript passed.
- ESLint passed.
- Production build passed.
- IDE diagnostics reported no linter errors.

## Current Repository Layout

The repository started empty except for Git metadata. It now contains two separate applications:

```text
apps/
  api/
  web/
```

Backend app:

```text
apps/api
```

Frontend app:

```text
apps/web
```

## Current Completion Status

Completed:

- Product requirements
- System architecture
- Database design
- UI/UX design
- Backend implementation
- Frontend implementation
- Backend TypeScript validation
- Backend local migration validation
- Frontend TypeScript validation
- Frontend lint validation
- Frontend production build validation

## Workspace Access (Security)

The journal management workspace is intentionally not linked from the public site. Access relies on:

- A non-guessable frontend route segment (configured in `apps/web/lib/admin-path.ts`)
- Password authentication via the API (`ADMIN_PASSWORD_HASH` secret)
- HttpOnly session cookies with rate-limited login

The workspace URL is not documented here and should not be committed to public-facing materials. Rotate the path segment if it is ever exposed.

## Recommended Next Phases

Suggested future work:

- Configure real Cloudflare D1, KV, and R2 resources.
- Set production secrets.
- Configure Google OAuth redirect URLs for deployed domains.
- Connect a real transactional email provider.
- Add automated backend tests.
- Add automated frontend tests.
- Add CI/CD workflows.
- Add deployment workflows.
- Add backend integration tests.
- Add frontend component tests.
- Add scheduled notification generation.
- Expand recommendation ranking logic.
- Add review moderation workflows.
- Add production monitoring and analytics.

## QA Review

A full quality assurance review of the project is documented in:

- [QA_REPORT.md](./QA_REPORT.md)

That report covers bugs, performance issues, security issues, accessibility issues, and UX issues identified across backend and frontend, with severity ratings and recommended fix priorities.

## Security Assessment

A penetration-test-style security review of the project is documented in:

- [SECURITY_REPORT.md](./SECURITY_REPORT.md)

That report covers authentication, authorization, API security, OWASP Top 10 mapping, rate limiting, input validation, penetration test scenarios, and a remediation roadmap.

