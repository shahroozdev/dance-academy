import { ListChecks } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function EnrollmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Enrollments" subtitle="Link students to classes and manage enrollment status." />
      <ComingSoon
        icon={ListChecks}
        title="Enrollments module coming soon"
        description="Active and ended enrollments across all classes will appear here."
      />
    </div>
  );
}
