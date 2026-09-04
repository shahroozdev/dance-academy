import { Wallet } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" subtitle="Record and track tuition payments against student billing." />
      <ComingSoon
        icon={Wallet}
        title="Payments module coming soon"
        description="Zelle, cash, and check payments applied to monthly billing will appear here."
      />
    </div>
  );
}
