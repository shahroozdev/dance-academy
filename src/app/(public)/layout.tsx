import { PUBLIC_FONT_CLASS } from "@/app/(public)/fonts";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/public-site";
import { SITE_URL } from "@/lib/site-url";

import type { Metadata } from "next";

// Defaults for every public page. Each page sets its own title, description, canonical address
// and link-preview text and image through `pageMetadata` (src/lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Indian Dance Classes in Wood Dale & Elgin, IL`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    // Lets Google show full-size image previews and full-length snippets for these pages.
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Paste the code from Google Search Console into this setting to verify ownership of the site.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  manifest: "/site.webmanifest",
};

// Shared by the home page and the inner pages: only the fonts. Each kind of page brings its own
// header and scrolling (full-screen sections on home, an ordinary scrolling page elsewhere).
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className={`${PUBLIC_FONT_CLASS} flex min-h-dvh flex-col font-public`}>{children}</div>;
}
