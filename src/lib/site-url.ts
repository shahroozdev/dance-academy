// The public address of the website, with no trailing slash. Canonical links, the sitemap,
// robots.txt, share images and structured data are all built from it, so it must be the real
// domain in production. Set NEXT_PUBLIC_SITE_URL there; NEXTAUTH_URL is the fallback because the
// app already requires it and it normally holds the same address.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

/** Absolute URL for a path on this site: `absoluteUrl("/about")`. */
export const absoluteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`;
