import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // We maintain AGENTS.md by hand — don't let Next.js regenerate/overwrite it.
  agentRules: false,
  images: {
    remotePatterns: [
      // Every stored file (site photos and videos, Media Library, logo, receipts) lives in Cloudinary.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      // PDF uploads to the Media Library (capped at 4 MB in src/actions/content-media.ts) and
      // the admin's logo and receipt uploads pass through a server action; the default limit is
      // 1 MB. Images and videos go straight from the browser to Cloudinary instead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
