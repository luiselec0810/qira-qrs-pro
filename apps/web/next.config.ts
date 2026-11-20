import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Single .env at the monorepo root shared by every workspace.
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@qira/shared"],
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.BASE_URL ?? "http://localhost:3000",
  },
  // Alias node-only optional "canvas" dependency of konva to false so SSR/prerender never requires it.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = { ...(config.resolve.alias ?? {}), canvas: false };
    return config;
  },
  async rewrites() {
    return [
      // The redirect engine lives in the API; the public origin stays BASE_URL.
      { source: "/q/:path*", destination: `${API_URL}/q/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
