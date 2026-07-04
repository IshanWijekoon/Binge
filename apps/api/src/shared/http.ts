import { AppError } from "./errors";

export type JsonObject = Record<string, unknown>;

export const json = (body: unknown, init: ResponseInit = {}): Response => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
};

export const noContent = (): Response => new Response(null, { status: 204 });

export const parseJson = async <T extends JsonObject>(request: Request): Promise<T> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Expected application/json request body");
  }

  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AppError(400, "BAD_REQUEST", "Expected a JSON object");
    }
    return value as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
};

export const errorResponse = (error: unknown): Response => {
  if (error instanceof AppError) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error(JSON.stringify({ level: "error", message: "Unhandled request error", error: String(error) }));
  return json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" } }, { status: 500 });
};

export const withCors = (response: Response, request: Request, env: Env): Response => {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim());

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-credentials", "true");
  }

  headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const getPathSegments = (request: Request): string[] => {
  const url = new URL(request.url);
  return url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
};

export const getPathSuffix = (request: Request, prefix: string): string | null => {
  const url = new URL(request.url);
  const normalizedPrefix = `/api/v1/${prefix.replace(/^\/+|\/+$/g, "")}/`;
  if (!url.pathname.startsWith(normalizedPrefix)) {
    return null;
  }
  const suffix = url.pathname.slice(normalizedPrefix.length);
  return suffix ? decodeURIComponent(suffix) : null;
};
