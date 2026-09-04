import { TrendingUp } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function OtherIncomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Other Income" subtitle="Track income outside of regular monthly tuition." />
      <ComingSoon
        icon={TrendingUp}
        title="Other income module coming soon"
        description="Registration fees, workshops, and performance income will appear here."
      />
    </div>
  );
}
