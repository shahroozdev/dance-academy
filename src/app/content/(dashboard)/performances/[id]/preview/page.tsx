import { getContentPerformanceById } from "@/actions/content-performances";
import { PreviewFrame } from "@/components/content/preview-frame";
import { PerformanceView } from "@/components/public/performance-view";
import { toPublicPerformance } from "@/lib/content-mappers";

// A draft performance as its public page would look. The action checks the content session, so
// this page is never reachable without one.
export default async function PerformancePreviewPage({ params }: PageProps<"/content/performances/[id]/preview">) {
  const { id } = await params;
  const performance = await getContentPerformanceById(id);

  return (
    <PreviewFrame status={performance.status} backHref={`/content/performances/${id}`}>
      <PerformanceView performance={toPublicPerformance(performance)} />
    </PreviewFrame>
  );
}
