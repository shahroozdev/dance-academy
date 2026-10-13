import { notFound } from "next/navigation";

import { getPublicPerformance } from "@/actions/public-content";
import { JsonLd } from "@/components/public/json-ld";
import { PerformanceView } from "@/components/public/performance-view";
import { breadcrumbJsonLd, jsonLdGraph, pageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

// Only published performances have a page; a draft, an archived one, or an unknown address is a 404.
export async function generateMetadata({ params }: PageProps<"/performances/[slug]">): Promise<Metadata> {
  const performance = await getPublicPerformance((await params).slug);
  if (!performance) return {};
  return pageMetadata({
    title: performance.title,
    description: performance.summary,
    path: `/performances/${performance.slug}`,
  });
}

export default async function PerformancePage({ params }: PageProps<"/performances/[slug]">) {
  const performance = await getPublicPerformance((await params).slug);
  if (!performance) notFound();

  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbJsonLd([
            { name: "Performances", path: "/performances" },
            { name: performance.title, path: `/performances/${performance.slug}` },
          ]),
        )}
      />
      <PerformanceView performance={performance} />
    </>
  );
}
