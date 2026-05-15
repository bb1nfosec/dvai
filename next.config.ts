import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No output: "standalone" — Vercel manages its own build output.
  // Setting standalone can prevent Vercel from picking up code changes.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
