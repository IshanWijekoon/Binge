import { tooManyRequests } from "../../shared/errors";

export class RateLimiter {
  constructor(private readonly cache: KVNamespace) {}

  async check(key: string, limit: number, windowSeconds: number): Promise<void> {
    const bucket = `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const currentRaw = await this.cache.get(bucket);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
    if (current >= limit) {
      throw tooManyRequests();
    }
    await this.cache.put(bucket, String(current + 1), { expirationTtl: windowSeconds + 5 });
  }
}
