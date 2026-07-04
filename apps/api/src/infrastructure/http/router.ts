import { AdminAuthService } from "../../application/admin-auth-service";
import { JournalService } from "../../application/journal-service";
import { TVService } from "../../application/tv-service";
import type { JournalShowStatus } from "../../domain/types";
import { badRequest, notFound } from "../../shared/errors";
import { getPathSegments, getPathSuffix, json, noContent, parseJson } from "../../shared/http";
import { optionalBoolean, requireEnum, requireInteger, requireString } from "../../shared/validation";
import { AdminSessionRepository } from "../repositories/admin-sessions";
import { JournalRepository } from "../repositories/journal";
import { EpisodeWatchHistoryRepository, FollowedShowRepository } from "../repositories/tv-user-state";
import { TVmazeProvider } from "../providers/tv/tvmaze-provider";
import { sha256Hex } from "../security/crypto";
import { RateLimiter } from "./rate-limit";

const mediaTypes = ["movie", "show"] as const;
const journalStatuses = ["watching", "completed", "plan-to-watch", "on-hold", "dropped"] as const;

export class ApiRouter {
  private readonly limiter: RateLimiter;
  private readonly tvProvider: TVmazeProvider;
  private readonly tv: TVService;
  private readonly journal: JournalService;
  private readonly adminAuth: AdminAuthService;

  constructor(private readonly env: Env) {
    this.limiter = new RateLimiter(env.CACHE);
    this.tvProvider = new TVmazeProvider(env, env.CACHE);
    this.tv = new TVService(this.tvProvider, new FollowedShowRepository(env.DB), new EpisodeWatchHistoryRepository(env.DB));
    this.journal = new JournalService(this.tvProvider, new JournalRepository(env.DB));
    this.adminAuth = new AdminAuthService(env, new AdminSessionRepository(env.DB));
  }

  async handle(request: Request, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const segments = getPathSegments(request);

    if (request.method === "OPTIONS") {
      return noContent();
    }
    if (url.pathname === "/health" || url.pathname === "/api/v1/health") {
      return json({ status: "ok", service: "binge-api" });
    }

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    await this.limiter.check(`rate:${await sha256Hex(ip)}:${segments[0] ?? "root"}`, 120, 60);

    if (segments[0] === "admin" && segments[1] === "login" && request.method === "POST") {
      await this.limiter.check(`admin:login:${await sha256Hex(ip)}`, 5, 900);
      const body = await parseJson(request);
      const password = requireString(body.password, "password", 256);
      return this.adminAuth.login(request, password);
    }

    if (segments[0] === "admin" && segments[1] === "logout" && request.method === "POST") {
      return this.adminAuth.logout(request);
    }

    if (segments[0] === "admin" && segments[1] === "me" && request.method === "GET") {
      return this.adminAuth.me(request);
    }

    if (segments[0] === "public") {
      return this.handlePublic(request, segments);
    }

    if (segments[0] === "admin") {
      return this.handleAdmin(request, segments);
    }

    if (segments[0] === "tv") {
      return this.handleTv(request, segments);
    }

    throw notFound("Route not found");
  }

  private async handlePublic(request: Request, segments: string[]): Promise<Response> {
    if (request.method === "GET" && segments[1] === "shows" && !segments[2]) {
      return json({ shows: await this.journal.listShows() });
    }

    if (request.method === "GET" && segments[1] === "shows" && segments[2] === "status" && segments[3]) {
      const status = requireEnum(segments[3], "status", journalStatuses);
      return json({ shows: await this.journal.listShowsByStatus(status) });
    }

    if (request.method === "GET" && segments[1] === "shows" && segments[2]) {
      const showId = getPathSuffix(request, "public/shows");
      if (!showId || showId.startsWith("status/")) {
        throw notFound("Public route not found");
      }
      return json({ show: await this.journal.getShow(showId) });
    }

    if (request.method === "GET" && segments[1] === "calendar") {
      return json({ entries: await this.journal.getCalendar() });
    }

    if (request.method === "GET" && segments[1] === "reviews") {
      return json({ reviews: await this.journal.getReviews() });
    }

    if (request.method === "GET" && segments[1] === "stats") {
      return json({ stats: await this.journal.getStats() });
    }

    if (request.method === "GET" && segments[1] === "feed") {
      return json({ feed: await this.journal.getFeed() });
    }

    throw notFound("Public route not found");
  }

  private async handleAdmin(request: Request, segments: string[]): Promise<Response> {
    if (segments[1] === "login" || segments[1] === "logout" || segments[1] === "me") {
      throw notFound("Admin route not found");
    }

    await this.adminAuth.authenticate(request);

    if (request.method === "GET" && segments[1] === "shows" && segments[2] === "search") {
      const query = requireString(new URL(request.url).searchParams.get("q"), "q", 120);
      return json({ results: await this.journal.searchShows(query) });
    }

    if (request.method === "GET" && segments[1] === "shows" && !segments[2]) {
      return json({ shows: await this.journal.listShows() });
    }

    if (request.method === "POST" && segments[1] === "shows" && !segments[2]) {
      const body = await parseJson(request);
      const showId = requireString(body.showId, "showId");
      const status = body.status ? requireEnum(body.status, "status", journalStatuses) : "plan-to-watch";
      return json({ show: await this.journal.addShow(showId, status) }, { status: 201 });
    }

    if (request.method === "GET" && segments[1] === "shows") {
      const showId = getPathSuffix(request, "admin/shows");
      if (!showId || showId === "search") {
        throw notFound("Admin route not found");
      }
      return json({ show: await this.journal.getShow(showId) });
    }

    const adminShowId = getPathSuffix(request, "admin/shows");
    if (request.method === "PATCH" && adminShowId && !adminShowId.endsWith("/refresh") && !adminShowId.endsWith("/mark-next") && !adminShowId.includes("/seasons/")) {
      const body = await parseJson(request);
      return json({
        show: await this.journal.updateShow(adminShowId.replace(/\/refresh$/, ""), {
          ...(body.status !== undefined ? { status: requireEnum(body.status, "status", journalStatuses) as JournalShowStatus } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: requireInteger(body.sortOrder, "sortOrder") } : {}),
          ...(body.currentSeason !== undefined ? { currentSeason: requireInteger(body.currentSeason, "currentSeason") } : {}),
          ...(body.currentEpisode !== undefined ? { currentEpisode: requireInteger(body.currentEpisode, "currentEpisode") } : {}),
        }),
      });
    }

    if (request.method === "DELETE" && adminShowId) {
      await this.journal.deleteShow(adminShowId);
      return noContent();
    }

    if (request.method === "POST" && adminShowId?.endsWith("/seasons/batch/watched")) {
      const showId = adminShowId.replace(/\/seasons\/batch\/watched$/, "");
      const body = await parseJson(request);
      if (!Array.isArray(body.seasons) || !body.seasons.length) {
        throw badRequest("seasons must be a non-empty array");
      }
      const seasons = body.seasons.map((season: unknown, index: number) => {
        if (typeof season !== "number" || !Number.isInteger(season)) {
          throw badRequest(`seasons[${index}] must be an integer`);
        }
        return season;
      });
      return json({ show: await this.journal.markSeasonsWatched(showId, seasons) });
    }

    if (request.method === "POST" && adminShowId?.includes("/seasons/") && adminShowId.endsWith("/watched")) {
      const match = adminShowId.match(/^(.+)\/seasons\/(\d+)\/watched$/);
      if (!match) {
        throw badRequest("Invalid season watched path");
      }
      const showId = match[1]!;
      const season = requireInteger(Number.parseInt(match[2]!, 10), "season");
      return json({ show: await this.journal.markSeasonWatched(showId, season) });
    }

    if (request.method === "POST" && adminShowId?.endsWith("/mark-next")) {
      const showId = adminShowId.replace(/\/mark-next$/, "");
      return json({ show: await this.journal.markNextEpisode(showId) });
    }

    if (request.method === "POST" && adminShowId?.endsWith("/refresh")) {
      const showId = adminShowId.replace(/\/refresh$/, "");
      return json({ show: await this.journal.refreshShow(showId) });
    }

    const episodeId = getPathSuffix(request, "admin/episodes");
    if (request.method === "POST" && episodeId === "batch/watched") {
      const body = await parseJson(request);
      if (!Array.isArray(body.episodeIds) || !body.episodeIds.length) {
        throw badRequest("episodeIds must be a non-empty array");
      }
      const episodeIds = body.episodeIds.map((id: unknown, index: number) => requireString(id, `episodeIds[${index}]`, 120));
      return json({ show: await this.journal.markEpisodesWatched(episodeIds) });
    }

    if (request.method === "POST" && episodeId?.endsWith("/watched")) {
      const body = await parseJson(request);
      const progressSeconds = body.progressSeconds === undefined ? undefined : requireInteger(body.progressSeconds, "progressSeconds");
      const show = await this.journal.markEpisodeWatched(episodeId.replace(/\/watched$/, ""), progressSeconds ?? 0);
      return json({ show }, { status: 201 });
    }

    if (request.method === "POST" && episodeId?.endsWith("/unwatched")) {
      const show = await this.journal.unmarkEpisodeWatched(episodeId.replace(/\/unwatched$/, ""));
      return json({ show });
    }

    if ((request.method === "POST" || request.method === "PATCH") && segments[1] === "reviews") {
      const body = await parseJson(request);
      const showId = requireString(body.showId, "showId");
      const reviewBody = requireString(body.body, "body", 5000);
      await this.journal.upsertReview(showId, reviewBody, optionalBoolean(body.containsSpoilers) ?? false);
      return json({ ok: true }, { status: 201 });
    }

    if ((request.method === "POST" || request.method === "PATCH") && segments[1] === "ratings") {
      const body = await parseJson(request);
      const showId = requireString(body.showId, "showId");
      const rating = requireInteger(body.rating, "rating");
      if (rating < 1 || rating > 10) {
        throw badRequest("rating must be between 1 and 10");
      }
      await this.journal.upsertRating(showId, rating);
      return json({ ok: true }, { status: 201 });
    }

    if ((request.method === "POST" || request.method === "PATCH") && segments[1] === "notes") {
      const body = await parseJson(request);
      const showId = requireString(body.showId, "showId");
      const noteBody = requireString(body.body, "body", 5000);
      await this.journal.upsertNote(showId, noteBody);
      return json({ ok: true }, { status: 201 });
    }

    throw notFound("Admin route not found");
  }

  private async handleTv(request: Request, segments: string[]): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && segments[1] === "search") {
      const query = requireString(url.searchParams.get("q") ?? url.searchParams.get("query"), "q", 120);
      return json({ results: await this.tv.searchShows(query) });
    }

    if (request.method === "GET" && segments[1] === "shows") {
      const suffix = getPathSuffix(request, "tv/shows");
      if (!suffix) {
        throw notFound("TV route not found");
      }
      if (suffix.endsWith("/seasons")) {
        const showId = suffix.replace(/\/seasons$/, "");
        return json({ seasons: await this.tv.getSeasons(showId) });
      }
      if (suffix.endsWith("/episodes")) {
        const showId = suffix.replace(/\/episodes$/, "");
        return json({
          episodes: await this.tv.getEpisodes(showId, {
            includeSpecials: url.searchParams.get("specials") === "1" || url.searchParams.get("specials") === "true",
          }),
        });
      }
      if (!suffix.includes("/")) {
        return json({ show: await this.tv.getShow(suffix) });
      }
    }

    if (request.method === "GET" && segments[1] === "episodes") {
      const episodePath = getPathSuffix(request, "tv/episodes");
      if (episodePath === "upcoming") {
        return json({ episodes: await this.tv.getUpcomingEpisodes("journal") });
      }
      if (episodePath === "recent") {
        return json({ episodes: await this.tv.getRecentlyAiredEpisodes("journal") });
      }
      if (episodePath) {
        return json({ episode: await this.tv.getEpisode(episodePath) });
      }
    }

    if (request.method === "GET" && segments[1] === "schedule") {
      const country = url.searchParams.get("country") ?? undefined;
      const date = url.searchParams.get("date") ?? undefined;
      const web = url.searchParams.get("web") === "1" || url.searchParams.get("web") === "true";
      const options = {
        ...(country !== undefined ? { country } : {}),
        ...(date !== undefined ? { date } : {}),
        web,
      };
      if (segments[2] === "today") {
        return json({ episodes: await this.tv.getTodaySchedule(options) });
      }
      return json({ episodes: await this.tv.getSchedule(options) });
    }

    throw notFound("TV route not found");
  }
}