# Binge — QA Review Report

**Reviewer role:** Senior QA Engineer  
**Scope:** Full project (`apps/api`, `apps/web`, migrations, configuration)  
**Method:** Static code review, architecture review, API contract analysis, local auth flow verification  
**Code changes during review:** None (review only)

---

## Executive Summary

Binge has a solid foundation: clear separation between frontend and backend, thoughtful D1 schema with indexes, hashed session tokens, OAuth state validation, and a workable local demo login path after the API proxy fix.

However, the product is **not production-ready**. Several issues block core user flows, and privacy/security controls are defined in the schema but not enforced in application logic.

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 10 |
| Medium | 38 |
| Low | 12 |

**Top blockers before any beta release:**

1. Discover/trending Save and Watched actions send TMDb IDs instead of local media UUIDs.
2. ISO timestamp vs SQLite `CURRENT_TIMESTAMP` comparison breaks session/OTP expiry logic.
3. Google OAuth is misconfigured for the proxied frontend setup.
4. Review and privacy settings are stored but not enforced on read paths.
5. Zero automated tests across the entire repository.

---

## Critical Findings

### C1. Discover/trending actions use TMDb `id` as local `mediaItemId`

**Area:** Frontend — Bugs  
**Files:** `apps/web/components/features/media-card.tsx`, `apps/web/lib/api.ts`

Search and trending results return raw TMDb objects where `id` is a numeric TMDb ID (e.g. `1399`). `MediaCard` resolves the local ID as `item.media_item_id ?? item.id`. Because TMDb `id` is truthy, `syncMedia()` is never called. The numeric ID is sent to `/tracking/media` and `/watchlists/items`, which expect UUIDs.

Additionally, `tmdbIdOf()` ignores `item.id` and falls back to `0`.

**Impact:** Core tracking flow fails for the primary discovery surfaces.

---

### C2. ISO `expires_at` compared against SQLite `CURRENT_TIMESTAMP` is unreliable

**Area:** Backend — Bugs / Security  
**Files:** `apps/api/src/application/auth-service.ts`, `apps/api/src/infrastructure/repositories/users.ts`, `apps/api/src/infrastructure/repositories/engagement.ts`

Expiry values are stored as ISO-8601 (`2026-07-02T10:15:00.000Z`) but validated with `expires_at > CURRENT_TIMESTAMP`, where SQLite returns `YYYY-MM-DD HH:MM:SS`. String comparison between these formats is lexicographic and incorrect.

**Affected flows:**

- Email OTP expiry (`email_login_challenges`)
- Session expiry (`sessions`)
- Notification expiry filtering

**Impact:** OTP codes and sessions may remain valid longer than intended.

---

### C3. Email verify endpoint has no brute-force protection

**Area:** Backend — Security  
**Files:** `apps/api/src/infrastructure/http/router.ts`, `apps/api/src/application/auth-service.ts`

`/auth/email/start` is rate-limited (5 per 15 minutes per email), but `/auth/email/verify` has no rate limit. Combined with a 6-digit numeric code (~1M possibilities), an attacker can brute-force codes for a known email address.

**Impact:** Account takeover risk for email-based authentication.

---

### C4. Google OAuth broken in default local/proxied setup

**Area:** Full stack — Bugs  
**Files:** `apps/api/wrangler.jsonc`, `apps/api/src/application/auth-service.ts`, `apps/web/next.config.ts`, `apps/web/lib/api.ts`

- `GOOGLE_REDIRECT_URI` points to `http://localhost:8787` (API port).
- Frontend proxies API through `http://localhost:3000`.
- OAuth callback lands on `:8787`; session cookie is set on the API origin, not the web origin.
- Post-login redirect is hardcoded to `"/"` on the API host.

**Impact:** Google login fails in the default dev setup. Email and demo login work; Google does not.

---

### C5. No automated test coverage

**Area:** Full stack — Quality  
**Files:** Entire repository

No unit, integration, or E2E tests were found.

**Impact:** High risk of regressions on every change.

---

## High Severity Findings

### H1. Review visibility and user privacy are never enforced

**Area:** Backend — Security / Privacy  
**Files:** `apps/api/src/infrastructure/repositories/engagement.ts`

`reviews.visibility` and `users.privacy_level` exist in schema and can be set via API, but `listForMedia()` returns all reviews without filtering by visibility, friendship, or owner privacy. Watchlist `visibility` is similarly never checked on read paths.

---

### H2. Friendship PATCH is an IDOR

**Area:** Backend — Security  
**Files:** `apps/api/src/infrastructure/repositories/engagement.ts`

`updateStatus()` scopes the UPDATE to participants, but the returned row is fetched by `id` only. A non-participant who knows a friendship UUID may receive the full row even when the UPDATE affects zero rows.

---

### H3. Bidirectional duplicate friendships possible

**Area:** Backend — Bugs  
**Files:** `apps/api/src/infrastructure/repositories/engagement.ts`, `migrations/0001_initial_schema.sql`

`UNIQUE (requester_id, addressee_id)` allows both `(A,B)` and `(B,A)`. Two rows can exist for the same pair with conflicting statuses.

---

### H4. `is_favorite` cleared on incidental tracking updates

**Area:** Backend — Bugs  
**Files:** `apps/api/src/infrastructure/repositories/tracking.ts`

`upsertUserMedia()` always writes `is_favorite = excluded.is_favorite`. When `isFavorite` is omitted (e.g. `markEpisodeWatched()`), it becomes `0` and overwrites an existing favorite on conflict.

---

### H5. KV rate limiter is non-atomic

**Area:** Backend — Security / Performance  
**Files:** `apps/api/src/infrastructure/http/rate-limit.ts`

Read-increment-write without atomicity. Concurrent requests can exceed configured limits.

---

### H6. Dashboard API failures are silent

**Area:** Frontend — UX / Bugs  
**Files:** `apps/web/components/features/binge-app.tsx`

`loadDashboard()` uses `Promise.allSettled` and only updates state for fulfilled calls. Failed endpoints leave stale or empty data with no user-visible error.

---

### H7. Media card actions have no loading/disabled guard

**Area:** Frontend — UX / Bugs  
**Files:** `apps/web/components/features/media-card.tsx`

Save/Watched fire async handlers with no busy state or button disable. Rapid clicks can duplicate requests.

---

### H8. Notification UX is incomplete and inconsistent

**Area:** Frontend — UX / Bugs  
**Files:** `apps/web/components/features/binge-app.tsx`, `apps/web/lib/api.ts`

- Mobile header badge uses total notification count.
- Home metric uses unread count.
- `markNotificationRead` exists in API client but is never used.
- No notification list UI.

---

### H9. Auth session bootstrap swallows all errors

**Area:** Frontend — UX  
**Files:** `apps/web/components/features/binge-app.tsx`

`loadSession()` catches all errors and sets `user` to `null` with no distinction between "not logged in" and network/server failures.

---

### H10. Logout leaves stale application state

**Area:** Frontend — Bugs  
**Files:** `apps/web/components/features/binge-app.tsx`

`logout()` clears only partial state. `api.logout()` is not wrapped in try/catch.

---

## Medium Severity Findings

### Bugs & Data Integrity

| ID | Finding | Location |
|----|---------|----------|
| M1 | No ownership check on asset downloads | `router.ts`, `storage/assets.ts` |
| M2 | Avatar upload lacks size limits and magic-byte validation | `storage/assets.ts` |
| M3 | Foreign key violations surface as generic 500 errors | `index.ts`, repositories |
| M4 | Friendship status changes lack authorization rules | `engagement.ts` |
| M5 | `syncSeason` URL/body IDs not cross-validated | `router.ts` |
| M6 | Episode watched accepts mismatched `mediaItemId` + `episodeId` | `tracking.ts` |
| M7 | `started_at` never set when status transitions to `watching` on update | `tracking.ts` |
| M8 | Discover tab switch keeps stale search results | `binge-app.tsx` |
| M9 | Watchlist API response shape mismatches frontend typing | `api.ts`, `binge-app.tsx` |
| M10 | TV shows display "Release TBD" — `first_air_date` not read | `media-card.tsx` |
| M11 | Double write on Save (`trackMedia` + `addWatchlistItem`) | `media-card.tsx` |
| M12 | `action="sync"` prop on `MediaCard` is a no-op | `media-card.tsx` |
| M13 | Profile form state not resynced when `user` prop changes | `binge-app.tsx` |
| M14 | Multiple unconsumed email challenges per address allowed | `users.ts` |
| M15 | `NotificationRepository.create()` never wired | `engagement.ts`, `router.ts` |

### Performance

| ID | Finding | Location |
|----|---------|----------|
| M16 | Sequential episode upserts in `syncSeason` (N+1 writes) | `catalog-service.ts` |
| M17 | Dead stats cache invalidation | `router.ts` |
| M18 | Full dashboard refetch after every card action | `binge-app.tsx`, `media-card.tsx` |
| M19 | Stats section re-filters library 5× per render | `binge-app.tsx` |
| M20 | Monolithic client bundle (~585 lines) | `binge-app.tsx` |
| M21 | No search request cancellation or deduplication | `binge-app.tsx` |
| M22 | Old avatar R2 objects never deleted on re-upload | `router.ts`, `assets.ts` |

### Security & Configuration

| ID | Finding | Location |
|----|---------|----------|
| M23 | `wrangler.jsonc` ships development defaults | `wrangler.jsonc` |
| M24 | TMDb/email upstream failures return opaque 500s | `tmdb.ts`, `email.ts` |
| M25 | No security headers on API responses | `shared/http.ts` |
| M26 | Session/email challenge tables grow with no cleanup | `migrations/` |

### Accessibility

| ID | Finding | Location |
|----|---------|----------|
| M27 | Auth form inputs lack associated `<label>` elements | `binge-app.tsx`, `input.tsx` |
| M28 | Navigation buttons lack `aria-current="page"` | `binge-app.tsx` |
| M29 | Auth page has no document `<h1>` | `binge-app.tsx`, `card.tsx` |
| M30 | Loading and error states not announced | `binge-app.tsx` |
| M31 | Notification badge lacks `aria-label` | `binge-app.tsx` |
| M32 | Horizontal media rails lack keyboard affordance | `binge-app.tsx` |

### UX

| ID | Finding | Location |
|----|---------|----------|
| M33 | Auth errors styled as neutral info | `binge-app.tsx` |
| M34 | No way to change email after code is sent | `binge-app.tsx` |
| M35 | No success feedback on profile save | `binge-app.tsx` |
| M36 | Global error banner persists until replaced | `binge-app.tsx` |
| M37 | Advertised features missing from UI (reviews, friends, ratings) | `binge-app.tsx`, `api.ts` |
| M38 | Mobile bottom nav touch targets likely under 44×44px | `binge-app.tsx` |

---

## Low Severity Findings

| ID | Finding | Location |
|----|---------|----------|
| L1 | API response shape inconsistent (camelCase vs snake_case vs TMDb raw) | Repositories, `api.ts` |
| L2 | `requireInteger` rejects JSON numeric strings | `validation.ts` |
| L3 | List keys use unstable index suffix | `binge-app.tsx` |
| L4 | No React error boundary | `app/page.tsx`, `layout.tsx` |
| L5 | Unused Radix dialog/dropdown dependencies | `package.json` |
| L6 | No `priority` on above-the-fold poster images | `media-card.tsx` |
| L7 | Layout uses system font only | `layout.tsx` |
| L8 | `tmdbIdOf` silent zero fallback | `api.ts` |
| L9 | Production cross-origin deployment not documented | `.env.example` |
| L10 | No section-level loading skeletons after refresh | `binge-app.tsx` |
| L11 | Demo login dev-only indicator is minimal | `binge-app.tsx` |
| L12 | `PROJECT_DOCUMENTATION.md` does not reference QA findings | Root docs |

---

## What Is Working Well

### Backend

- Session tokens stored as SHA-256 hashes; email codes stored as HMAC hashes.
- OAuth state is single-use, KV-backed, validated with timing-safe comparison, then deleted.
- Cookie flags: `HttpOnly`, `SameSite=Lax`, `Secure` disabled appropriately for local dev.
- CORS uses origin allowlist with credentials support.
- D1 schema includes thoughtful indexes for common query patterns.
- TMDb responses are KV-cached with sensible TTLs.
- Most mutating endpoints scope by `user_id` in SQL.
- Local demo login works with same-origin API proxy.

### Frontend

- Same-origin API proxy pattern is correct for cookie-based auth.
- `next/image` with TMDb `remotePatterns` and responsive `sizes`.
- Radix Tabs provide solid keyboard/focus behavior.
- Discover empty state falls back to trending content.
- `focus-visible:ring` on interactive elements.
- Dark premium visual system is cohesive and mobile-first.
- Responsive sidebar + bottom navigation pattern is sound.

---

## Recommended Fix Priority

### P0 — Before any user testing

1. Fix media ID resolution: always `syncMedia` first when `media_item_id` is absent; extend `tmdbIdOf` to read TMDb `id`.
2. Normalize all `expires_at` values to SQLite-compatible format or use `datetime('now')` consistently.
3. Add rate limiting on `/auth/email/verify`.
4. Fix Google OAuth redirect/cookie origin for proxied frontend.

### P1 — Before beta

5. Enforce review/watchlist visibility and user privacy on read paths.
6. Fix friendship model: canonical pair ordering, authorization on transitions, participant-scoped reads.
7. Preserve `is_favorite` on partial `upsertUserMedia` updates.
8. Add loading/disabled states on media card actions.
9. Surface dashboard API errors to users.
10. Add automated tests for auth, media sync, and tracking flows.

### P2 — Before production

11. Implement notification creation and UI.
12. Build reviews, ratings, and friends UI (or remove from marketing copy).
13. Accessibility pass: labels, `aria-current`, live regions, touch targets.
14. Performance: partial cache invalidation instead of full dashboard refetch.
15. Security headers, avatar validation, asset ownership checks.
16. Session/challenge cleanup job and R2 orphan deletion.

---

## Test Coverage Gaps (Recommended Suite)

| Area | Suggested tests |
|------|-----------------|
| Auth | OTP expiry, session expiry, demo login gate, email brute-force limits |
| Catalog | TMDb sync → local ID mapping, season/episode upsert |
| Tracking | Episode progress, favorite preservation, watch history uniqueness |
| Social | Friendship deduplication, visibility enforcement, IDOR on PATCH |
| Frontend | Media card Save/Watched on TMDb results, auth flow, error surfacing |
| E2E | Demo login → discover → save → watchlist → stats |

---

## Conclusion

Binge demonstrates strong architectural intent and a polished UI shell, but **core discovery-to-tracking flows are broken**, **auth expiry logic is unreliable**, and **privacy controls exist only on paper**. The project is suitable for continued internal development and demo iteration, but requires the P0 and P1 fixes above before any external beta.

---

## Related Documentation

- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) — Product, architecture, database, UI/UX, and implementation phases
