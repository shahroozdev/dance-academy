import { getPublicFestivals, getPublicPerformances } from "@/actions/public-content";
import { NAV_LINKS } from "@/lib/public-site";
import { absoluteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

// Lists the public pages for search engines, using each page's canonical address. /ananta itself
// only redirects to the newest edition, so each published festival year is listed instead, along
// with each published performance. Drafts and archived content are never listed. No "last
// modified" dates are given: the pages have no reliable ones, and Google ignores dates it finds
// to be inaccurate.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [festivals, performances] = await Promise.all([getPublicFestivals(), getPublicPerformances()]);

  const pages = NAV_LINKS.map((link) => link.href).filter((href) => href !== "/ananta");
  const editions = festivals.map((festival) => `/ananta/${festival.year}`);
  const performancePages = performances.map((performance) => `/performances/${performance.slug}`);
  return [...pages, ...editions, ...performancePages].map((path) => ({ url: absoluteUrl(path) }));
}
