import type { AdminSession } from "../domain/types";
import { badRequest, unauthorized } from "../shared/errors";
import { json, noContent } from "../shared/http";
import { randomToken, sha256Hex, verifyPasswordHash } from "../infrastructure/security/crypto";
import type { AdminSessionRepository } from "../infrastructure/repositories/admin-sessions";

export class AdminAuthService {
  constructor(
    private readonly env: Env,
    private readonly sessions: AdminSessionRepository,
  ) {}

  async login(request: Request, password: string): Promise<Response> {
    if (!this.env.ADMIN_PASSWORD_HASH) {
      throw badRequest("Admin password hash is not configured");
    }

    const isValid = await verifyPasswordHash(password, this.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      throw unauthorized("Invalid admin password");
    }

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const ttlSeconds = this.sessionTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    await this.sessions.create({
      id: crypto.randomUUID(),
      tokenHash,
      expiresAt,
    });

    const headers = new Headers();
    headers.append("set-cookie", this.sessionCookie(request, token, ttlSeconds));
    return json({ authenticated: true, admin: { id: "owner", expiresAt } satisfies AdminSession }, { headers });
  }

  async me(request: Request): Promise<Response> {
    const session = await this.authenticate(request);
    return json({ authenticated: true, admin: session });
  }

  async logout(request: Request): Promise<Response> {
    const token = this.readCookie(request, this.env.ADMIN_SESSION_COOKIE_NAME);
    if (token) {
      await this.sessions.revoke(await sha256Hex(token));
    }

    const headers = new Headers();
    headers.append("set-cookie", this.expiredSessionCookie(request));
    return new Response(null, { status: 204, headers });
  }

  async authenticate(request: Request): Promise<AdminSession> {
    const token = this.readCookie(request, this.env.ADMIN_SESSION_COOKIE_NAME);
    if (!token) {
      throw unauthorized("Admin session required");
    }

    const tokenHash = await sha256Hex(token);
    const session = await this.sessions.findByTokenHash(tokenHash);
    if (!session) {
      throw unauthorized("Invalid or expired admin session");
    }

    return { id: session.id, expiresAt: session.expires_at };
  }

  private sessionTtlSeconds(): number {
    const ttl = Number.parseInt(this.env.ADMIN_SESSION_TTL_SECONDS, 10);
    return Number.isInteger(ttl) && ttl > 0 ? ttl : 60 * 60 * 24 * 30;
  }

  private sessionCookie(request: Request, token: string, ttlSeconds: number): string {
    const secure = this.isSecureRequest(request) ? "; Secure" : "";
    return `${this.env.ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${ttlSeconds}; Path=/; HttpOnly${secure}; SameSite=Strict`;
  }

  private expiredSessionCookie(request?: Request): string {
    const secure = request && this.isSecureRequest(request) ? "; Secure" : "";
    return `${this.env.ADMIN_SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly${secure}; SameSite=Strict`;
  }

  private readCookie(request: Request, cookieName: string): string | null {
    const cookie = request.headers.get("cookie");
    if (!cookie) return null;

    const match = cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
    return match ? decodeURIComponent(match[1]!) : null;
  }

  private isSecureRequest(request: Request): boolean {
    return new URL(request.url).protocol === "https:";
  }
}
