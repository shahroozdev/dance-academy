import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Manage studio settings and admin users." />
      <ComingSoon
        icon={Settings}
        title="Settings module coming soon"
        description="Studio details, admin accounts, and roles will be managed here."
      />
    </div>
  );
}
