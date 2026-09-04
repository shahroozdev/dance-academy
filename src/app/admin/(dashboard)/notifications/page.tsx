import { BellRing } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" subtitle="Review the log of billing reminders sent to families." />
      <ComingSoon
        icon={BellRing}
        title="Notifications module coming soon"
        description="WhatsApp and email delivery status for billing notices will appear here."
      />
    </div>
  );
}
