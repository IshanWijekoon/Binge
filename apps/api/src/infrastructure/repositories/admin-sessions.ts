import { D1Repository, type Row } from "./d1";

export interface AdminSessionRow extends Row {
  id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export class AdminSessionRepository extends D1Repository {
  async create(input: { id: string; tokenHash: string; expiresAt: string }): Promise<void> {
    await this.run("INSERT INTO admin_sessions (id, token_hash, expires_at) VALUES (?, ?, ?)", input.id, input.tokenHash, input.expiresAt);
  }

  async findByTokenHash(tokenHash: string): Promise<AdminSessionRow | null> {
    return this.first<AdminSessionRow>(
      "SELECT * FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
      tokenHash,
    );
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.run("UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?", tokenHash);
  }
}
