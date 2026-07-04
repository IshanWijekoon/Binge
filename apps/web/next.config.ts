import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8787";
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");

const nextConfig: NextConfig = {
  output: "export",
  typedRoutes: true,
  turbopack: {
    root: workspaceRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "static.tvmaze.com",
      },
    ],
  },
};

export default nextConfig;
