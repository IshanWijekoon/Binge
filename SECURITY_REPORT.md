# Binge — Security Assessment & Penetration Test Report

**Assessment type:** Application security review (white-box) with penetration-test methodology  
**Scope:** `apps/api` (Cloudflare Workers), `apps/web` (Next.js), D1, KV, R2, authentication flows  
**Methodology:** Static code analysis, threat modeling, OWASP Top 10 (2021) mapping, auth/authz path tracing, abuse-case simulation  
**Code changes during assessment:** None (assessment only)

---

## Executive Summary

Binge implements several security fundamentals correctly: cryptographically random session tokens stored as hashes, HMAC-hashed email OTPs, OAuth CSRF state validation, parameterized SQL, CORS allowlisting with credentials, and HttpOnly session cookies.

However, the application has **critical authentication weaknesses** and **authorization gaps** that would allow account compromise and unauthorized data access in a production deployment. The most severe issues are:

1. **Email OTP brute force** on an unrate-limited verify endpoint.
2. **Broken session/OTP expiry** due to ISO vs SQLite timestamp comparison.
3. **Privacy controls stored but not enforced** (private reviews readable by any user).
4. **IDOR on friendship status updates** leaking relationship records.
5. **Demo login and development defaults** that could be mis-deployed to production.

**Overall security posture:** **High risk** — not suitable for production without remediation.

| Risk Level | Count |
|------------|-------|
| Critical | 6 |
| High | 9 |
| Medium | 11 |
| Low | 7 |
| Informational | 5 |

---

## Scope & Methodology

### In scope

- REST API (`/api/v1/*`)
- Session-based authentication (Google OAuth, email OTP, local demo)
- Authorization on user-owned resources
- CORS, cookies, rate limiting
- Input validation and output encoding
- R2 asset upload/download
- D1 data access patterns
- Frontend auth integration (cookie proxy, credentials)

### Out of scope

- Live network exploitation against deployed infrastructure
- Cloudflare WAF/Turnstile configuration (not present)
- TMDb API security (third-party)
- Email provider infrastructure
- Physical/social engineering

### Attack vectors simulated

- Credential stuffing / OTP brute force
- Session fixation and hijacking
- IDOR on friendships, assets, reviews
- CORS bypass attempts
- Rate limit evasion (concurrent requests)
- Privilege escalation via friendship status manipulation
- Unauthorized access to private content
- File upload abuse
- Demo login bypass in non-local environments

---

## Risk Rating Scale

| Level | Definition |
|-------|------------|
| **Critical** | Immediate exploitation; account takeover or mass data breach |
| **High** | Significant impact; exploitable with moderate effort |
| **Medium** | Limited impact or requires chaining with other flaws |
| **Low** | Minor impact or defense-in-depth gap |
| **Info** | Best-practice recommendation |

---

## 1. Authentication

### Strengths

| Control | Implementation |
|---------|----------------|
| Session token generation | `crypto.getRandomValues()` — 32-byte base64url tokens |
| Session storage | SHA-256 hash only; plaintext never persisted |
| Email OTP storage | HMAC-SHA256 with `SESSION_SECRET`; not plaintext |
| OAuth CSRF | Random state in KV, single-use, `timingSafeEqual` validation |
| Cookie flags | `HttpOnly`, `SameSite=Lax`, `Secure` in non-local environments |
| Logout | Server-side session revocation via `revoked_at` |
| Demo login gate | Requires `APP_ENV=development` + localhost hostname |

### Findings

#### AUTH-01 — Critical: Email OTP brute force (account takeover)

**Endpoint:** `POST /api/v1/auth/email/verify`  
**Files:** `apps/api/src/infrastructure/http/router.ts`, `apps/api/src/application/auth-service.ts`

Rate limit on `/auth/email/start` (5/15min per email) but **none** on verify. OTP is 6 digits (~1,000,000 values). Global rate limit is 120 req/min per IP per route segment — insufficient for verify-specific protection.

**Attack:** Attacker requests OTP for victim email, then brute-forces 000000–999999 against verify endpoint.  
**Impact:** Full account takeover for email-authenticated users.  
**CVSS estimate:** 9.1 (Critical)

---

#### AUTH-02 — Critical: Session and OTP expiry logic broken

**Files:** `apps/api/src/application/auth-service.ts`, `apps/api/src/infrastructure/repositories/users.ts`

`expires_at` stored as ISO-8601; compared with SQLite `CURRENT_TIMESTAMP`. ISO strings do not compare correctly against SQLite datetime format. Sessions and OTPs may remain valid far beyond intended TTL.

**Impact:** Extended session lifetime; OTP codes valid longer than 15 minutes on same UTC day.  
**CVSS estimate:** 8.2 (High → Critical when chained with AUTH-01)

---

#### AUTH-03 — High: Weak OTP entropy

**File:** `apps/api/src/application/auth-service.ts`

`generateNumericCode()` uses modulo on 32-bit value → ~20 bits effective entropy, not uniform across 1M space.

**Impact:** Reduces brute-force search space; amplifies AUTH-01.  
**CVSS estimate:** 7.5 (High)

---

#### AUTH-04 — High: Multiple active OTP challenges per email

**File:** `apps/api/src/infrastructure/repositories/users.ts`

Each `/auth/email/start` inserts a new challenge without invalidating prior ones.

**Impact:** Multiple valid codes exist simultaneously; widens brute-force window.  
**CVSS estimate:** 6.5 (Medium–High)

---

#### AUTH-05 — High: Google OAuth session lands on wrong origin

**Files:** `apps/api/wrangler.jsonc`, `apps/api/src/application/auth-service.ts`, `apps/web/next.config.ts`

Callback on `:8787`, frontend on `:3000` via proxy. Cookie scoped to API host.

**Impact:** Google login fails in dev; production misconfiguration risk if redirect URI not aligned.  
**CVSS estimate:** 5.3 (Medium)

---

#### AUTH-06 — Medium: No session rotation on login

New session created on each login; old sessions not revoked.

**Impact:** Stolen session tokens remain valid until expiry (30 days) even after user logs in elsewhere.  
**CVSS estimate:** 5.0 (Medium)

---

#### AUTH-07 — Medium: Demo login relies on hostname + env var only

**File:** `apps/api/src/application/auth-service.ts`

If `APP_ENV=development` is deployed to a staging host or env is mis-set in production, demo login creates a known shared account without credentials.

**Impact:** Unauthorized access in misconfigured deployments.  
**CVSS estimate:** 7.0 (High) if mis-deployed

---

#### AUTH-08 — Low: Email verification flow depends entirely on OTP security

Acceptable if OTP is secure; critical if AUTH-01 is exploited.

---

#### AUTH-09 — Info: No MFA / passkey support

Not a vulnerability; noted for production readiness.

---

## 2. Authorization

### Model

- Default: all routes except `/auth/*` and `/health` require `authenticate(request)`.
- User scoping: most mutations include `user_id` in SQL WHERE clauses.

### Strengths

- Tracking, watchlists, notifications, review delete scoped by `user_id`.
- Friendship UPDATE requires participant match.
- Notification mark-read scoped to owner.

### Findings

#### AUTHZ-01 — Critical: Private reviews exposed to all authenticated users

**Endpoint:** `GET /api/v1/reviews?mediaItemId=...`  
**File:** `apps/api/src/infrastructure/repositories/engagement.ts`

`listForMedia()` has no visibility filter. Users can set `visibility: "private"` on POST but it is ignored on read.

**Attack:** Any logged-in user lists reviews for any media item and reads private reviews.  
**Impact:** Privacy violation; potential PII/spoiler leakage.  
**CVSS estimate:** 6.5 (Medium–High)

---

#### AUTHZ-02 — High: User `privacy_level` not enforced anywhere

`privacy_level` stored and patchable via `PATCH /users/me` but no endpoint checks it before exposing profile, library, or activity.

**Impact:** Users cannot actually control profile visibility as product promises.  
**CVSS estimate:** 5.3 (Medium)

---

#### AUTHZ-03 — High: Friendship PATCH IDOR (information disclosure)

**Endpoint:** `PATCH /api/v1/friends/:friendshipId`  
**File:** `apps/api/src/infrastructure/repositories/engagement.ts`

UPDATE scoped to participants; SELECT by `id` only. Non-participant receives friendship record if UUID exists.

**Impact:** Enumeration and disclosure of friendship relationships.  
**CVSS estimate:** 6.5 (Medium–High)

---

#### AUTHZ-04 — High: Friendship status transitions lack role checks

Either party can set any status including `accepted`. Requester can self-accept pending requests.

**Impact:** Social graph integrity broken; harassment vector.  
**CVSS estimate:** 5.3 (Medium)

---

#### AUTHZ-05 — Medium: Asset download lacks ownership check

**Endpoint:** `GET /api/v1/assets/{key}`  
**Files:** `apps/api/src/infrastructure/http/router.ts`, `apps/api/src/infrastructure/storage/assets.ts`

Any authenticated user with object key can fetch. Keys exposed via `avatar_object_key` in review JOINs.

**Impact:** Unauthorized file access.  
**CVSS estimate:** 5.0 (Medium)

---

#### AUTHZ-06 — Medium: Watchlist visibility not enforced

`visibility` column on `watchlists` never checked on `GET /watchlists`.

---

#### AUTHZ-07 — Medium: No authorization on catalog sync writes

Any authenticated user can `POST /catalog/sync` and season sync endpoints, polluting shared catalog data.

**Impact:** Catalog integrity abuse; potential DoS via mass sync.  
**CVSS estimate:** 4.3 (Medium)

---

#### AUTHZ-08 — Low: Self-friendship blocked only at DB layer

FK/CHECK violation returns 500, not 400.

---

## 3. API Security

#### API-01 — High: No security response headers

**File:** `apps/api/src/shared/http.ts`

No `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

**CVSS estimate:** 4.0 (Medium)

---

#### API-02 — High: CORS allowlist committed with localhost defaults

**File:** `apps/api/wrangler.jsonc`

Production deployment without override may block legitimate origins or accidentally allow dev origins.

**CVSS estimate:** 4.0 (Medium)

---

#### API-03 — Medium: Health endpoint unauthenticated

`GET /health`, `GET /api/v1/health` — service name disclosure.

---

#### API-04 — Medium: Error responses may leak internal state

Unhandled D1 FK errors → generic 500. Positive: no stack traces in response body.

---

#### API-05 — Medium: No request size limits on avatar upload

Worker memory limits provide implicit cap; explicit limits recommended.

---

#### API-06 — Medium: TMDb token server-side only (positive)

TMDb API token in Worker secrets; not exposed to client.

---

#### API-07 — Low: No API versioning beyond `/v1` path

---

#### API-08 — Info: Next.js rewrite proxies API without additional auth

Ensure production rewrite target is trusted internal URL only.

---

## 4. OWASP Top 10 (2021) Mapping

| OWASP | Category | Status | Key Findings |
|-------|----------|--------|--------------|
| **A01** | Broken Access Control | **FAIL** | AUTHZ-01–07: private reviews, friendship IDOR, asset access, privacy not enforced |
| **A02** | Cryptographic Failures | **PARTIAL** | Good hashing; AUTH-02 broken expiry comparisons |
| **A03** | Injection | **PASS** | Parameterized D1 queries; no SQL injection surface identified |
| **A04** | Insecure Design | **FAIL** | Privacy model designed but not implemented; friendship state machine flawed |
| **A05** | Security Misconfiguration | **FAIL** | AUTH-07, API-02: dev defaults in config; no security headers |
| **A06** | Vulnerable Components | **INFO** | Recommend `npm audit` in CI |
| **A07** | Auth Failures | **FAIL** | AUTH-01–04: OTP brute force, weak entropy, broken expiry |
| **A08** | Software/Data Integrity | **PASS** | OAuth state validation; no unsigned webhooks |
| **A09** | Logging & Monitoring | **PARTIAL** | Observability enabled; no security event logging |
| **A10** | SSRF | **LOW RISK** | Outbound fetch only to Google OAuth, TMDb, email provider |

---

## 5. Rate Limiting

### Current implementation

| Endpoint / Scope | Limit | Window |
|------------------|-------|--------|
| Global per IP per route segment | 120 | 60s |
| Email start per email | 5 | 900s |
| Email verify | **None** | — |
| Auth demo | **None** (gated by env) | — |
| Login/logout | Global only | — |
| Catalog search/sync | Global only | — |

### Findings

#### RL-01 — Critical: Email verify unprotected (see AUTH-01)

#### RL-02 — High: Non-atomic KV counter (race condition)

**File:** `apps/api/src/infrastructure/http/rate-limit.ts`

Read-increment-write without atomicity. Concurrent requests can bypass limits.

**CVSS estimate:** 6.0 (Medium–High)

---

#### RL-03 — Medium: IP derived from `cf-connecting-ip` with fallback `"unknown"`

All requests without CF IP header share one rate limit bucket in local dev.

---

#### RL-04 — Medium: No per-user rate limits on authenticated endpoints

---

#### RL-05 — Low: No `Retry-After` header on 429 responses

---

## 6. Input Validation

### Strengths

| Control | Coverage |
|---------|----------|
| JSON body parsing | Content-Type check; rejects non-objects |
| String fields | Trim, max length, required checks |
| Enums | `requireEnum` for status, visibility, media type |
| Integers | Type and integer validation |
| SQL | Parameterized queries — no SQL injection found |
| XSS in API | JSON responses; no HTML rendering server-side |

### Findings

#### IV-01 — Medium: No email format validation

`requireString` only; no RFC pattern check.

---

#### IV-02 — Medium: `requireInteger` rejects string numbers

Integration gap, not direct security issue.

---

#### IV-03 — Medium: Avatar upload trusts `Content-Type` header only

**File:** `apps/api/src/infrastructure/storage/assets.ts`

Spoofable content type; no magic-byte validation.

**CVSS estimate:** 5.0 (Medium)

---

#### IV-04 — Medium: No file size limit on avatar upload

Storage/cost abuse; Worker resource exhaustion risk.

---

#### IV-05 — Medium: Review body stored without sanitization

Stored XSS risk on frontend when reviews UI is built.

---

#### IV-06 — Low: Asset path uses `decodeURIComponent` without traversal hardening

Low risk with UUID-based keys.

---

#### IV-07 — Low: UUID parameters not validated as UUID format

Invalid IDs cause 500 instead of 400.

---

#### IV-08 — Medium: No validation that `episodeId` belongs to `mediaItemId`

Data integrity issue with mild authz angle.

---

## 7. Penetration Test Scenarios

| Scenario | Result |
|----------|--------|
| Access `/tracking/library` without cookie | **Blocked** — 401 |
| Forge session cookie | **Blocked** — hash lookup fails |
| Replay consumed OAuth state | **Blocked** — deleted after use |
| CORS request from evil.com with credentials | **Blocked** — no ACAO header |
| CORS preflight from allowed origin | **Allowed** — correct |
| IDOR: delete another user's review | **Blocked** — `user_id` in DELETE |
| IDOR: read another user's notifications | **Blocked** — scoped query |
| IDOR: friendship record by UUID | **Vulnerable** — AUTHZ-03 |
| Brute force email OTP | **Vulnerable** — AUTH-01 |
| Demo login from production host | **Blocked** if `APP_ENV` ≠ development |
| Demo login with `APP_ENV=development` on public staging | **Vulnerable** — AUTH-07 |
| SQL injection in search query | **Not vulnerable** — parameterized |
| Session fixation | **Not vulnerable** — new token on login |

---

## 8. Frontend Security (Brief)

| Finding | Severity |
|---------|----------|
| API calls use `credentials: "include"` — correct for cookie auth | Positive |
| No secrets in client bundle | Positive |
| No CSP configured in Next.js | Medium |
| Auth errors indistinguishable from network errors | Low |
| Google OAuth link points to API origin directly | High |
| No CSRF tokens on state-changing requests | Low — mitigated by `SameSite=Lax` |

---

## 9. Remediation Roadmap

### Immediate (0–7 days) — Block production deploy

| Priority | Finding | Remediation |
|----------|---------|-------------|
| P0 | AUTH-01 | Rate limit `/auth/email/verify` per email + per IP; lockout after N failures |
| P0 | AUTH-02 | Store/compare `expires_at` using SQLite `datetime()` consistently |
| P0 | AUTHZ-01 | Filter reviews by visibility + friendship in `listForMedia` |
| P0 | AUTHZ-03 | Return friendship only if user is participant; verify update affected rows |
| P0 | RL-02 | Use atomic increment for rate limiting |

### Short term (1–4 weeks)

| Priority | Finding | Remediation |
|----------|---------|-------------|
| P1 | AUTH-03 | Use full-range random codes or longer alphanumeric OTP |
| P1 | AUTH-04 | Invalidate prior challenges on new OTP request |
| P1 | AUTHZ-04 | Enforce friendship state machine (only addressee accepts) |
| P1 | AUTHZ-05 | Verify asset key ownership before R2 get |
| P1 | IV-03/04 | Magic-byte validation + max upload size |
| P1 | API-01 | Add security headers middleware |
| P1 | AUTH-07 | Remove demo endpoint from production builds entirely |

### Medium term (1–3 months)

- Enforce `privacy_level` across all read endpoints
- Session rotation and concurrent session management
- Security event logging (failed auth, rate limit hits, IDOR attempts)
- Automated security tests in CI
- Cloudflare Turnstile on auth endpoints
- `npm audit` / dependency scanning
- Penetration retest after fixes

---

## 10. Positive Security Controls

1. No plaintext secrets in repository — secrets via Wrangler + `.dev.vars`.
2. Parameterized SQL — consistent bound parameters; no injection found.
3. Session tokens never stored in plaintext — SHA-256 at rest.
4. OTP codes never stored in plaintext — HMAC-SHA256.
5. OAuth CSRF protection — state parameter with KV, timing-safe compare, single use.
6. HttpOnly cookies — reduces XSS token theft impact.
7. CORS credentials — explicit origin allowlist; no wildcard with credentials.
8. Authentication required — default deny on protected routes.
9. User-scoped mutations — majority of write operations include `user_id` constraint.
10. TMDb token server-side only — not exposed to browser.
11. Demo login defense in depth — env + hostname check (when correctly deployed).
12. Journal workspace UI uses a non-guessable frontend route with no public navigation links; API admin endpoints remain password-protected separately.

---

## 11. Conclusion

Binge's security architecture shows awareness of modern auth practices (hashed sessions, OAuth state, parameterized queries). However, **the email authentication flow is critically vulnerable to brute force**, **expiry logic is broken**, and **authorization for privacy-sensitive features is not implemented**.

From a penetration testing perspective, an attacker with network access could:

1. Take over any email-based account via OTP brute force.
2. Read any user's private reviews.
3. Enumerate friendship records via IDOR.
4. Bypass rate limits with concurrent requests.

**Recommendation:** Do not deploy to production until P0 remediations are complete and verified by retest.

---

## Related Documentation

- [QA_REPORT.md](./QA_REPORT.md) — Broader quality findings including UX and performance
- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) — Architecture and implementation overview

---

*Report generated from static analysis and threat modeling. A full black-box penetration test against a deployed environment is recommended after remediation.*
