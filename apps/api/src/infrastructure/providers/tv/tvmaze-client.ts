import { AppError, notFound, tooManyRequests } from "../../../shared/errors";

export class TVmazeClient {
  constructor(private readonly env: Env) {}

  async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.env.TVMAZE_BASE_URL}${path}`, {
        headers: {
          accept: "application/json",
          "user-agent": "Binge TV Tracker MVP (contact: ops@binge.local)",
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw notFound("TV metadata not found");
      }
      if (response.status === 429) {
        throw tooManyRequests("TV metadata provider rate limit exceeded");
      }
      if (!response.ok) {
        throw new AppError(503, "TV_PROVIDER_UNAVAILABLE", "TV metadata provider is unavailable");
      }

      return response.json<T>();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AppError(504, "TV_PROVIDER_TIMEOUT", "TV metadata provider timed out");
      }
      throw new AppError(502, "TV_PROVIDER_BAD_RESPONSE", "TV metadata provider returned an invalid response");
    } finally {
      clearTimeout(timeout);
    }
  }
}
