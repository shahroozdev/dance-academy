import { Users } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function FamiliesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Families" subtitle="Manage family accounts, contacts, and household details." />
      <ComingSoon
        icon={Users}
        title="Families module coming soon"
        description="Family records, contacts, and linked students will appear here."
      />
    </div>
  );
}
