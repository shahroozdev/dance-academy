import { GraduationCap } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Students" subtitle="Track enrolled students, profiles, and class history." />
      <ComingSoon
        icon={GraduationCap}
        title="Students module coming soon"
        description="Student profiles, enrollment history, and billing status will appear here."
      />
    </div>
  );
}
