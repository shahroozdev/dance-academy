import { SITE_URL } from "@/lib/site-url";

import type { MetadataRoute } from "next";

// Search engines may crawl everything except the app's internal endpoints. The staff area and the
// registration form are kept out of search results with a "noindex" tag on those pages instead of
// being blocked here: Google can only obey that tag on pages it is allowed to fetch, and a blocked
// address can still be listed if another site links to it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
