import { Receipt } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" subtitle="Generate and review monthly student billing." />
      <ComingSoon
        icon={Receipt}
        title="Billing module coming soon"
        description="Monthly tuition, discounts, and balances due will appear here."
      />
    </div>
  );
}
