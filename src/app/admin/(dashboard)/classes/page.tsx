import { CalendarDays } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function ClassesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Classes" subtitle="Set up dance classes, schedules, teachers, and pricing." />
      <ComingSoon
        icon={CalendarDays}
        title="Classes module coming soon"
        description="Class schedules, dance styles, and standard rates will appear here."
      />
    </div>
  );
}
