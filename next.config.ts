import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // We maintain AGENTS.md by hand — don't let Next.js regenerate/overwrite it.
  agentRules: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
