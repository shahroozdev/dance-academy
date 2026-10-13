import type { Metadata } from "next";

// Like the staff area, the Content Portal must never appear in search results. A "noindex" tag
// is the reliable way to say so; see src/app/robots.ts for why it is used instead of blocking
// the address.
export const metadata: Metadata = {
  title: "Content Portal | Malhaar Dance Company",
  robots: { index: false, follow: false },
};

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
