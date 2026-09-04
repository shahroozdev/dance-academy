import { ClipboardList } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function RegistrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registration Requests"
        subtitle="Review new registration requests and match them to families and classes."
      />
      <ComingSoon
        icon={ClipboardList}
        title="Registration requests module coming soon"
        description="Pending, processed, and rejected registration requests will appear here."
      />
    </div>
  );
}
