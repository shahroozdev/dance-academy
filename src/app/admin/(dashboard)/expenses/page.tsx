import { ReceiptText } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Expenses" subtitle="Log studio expenses by category, such as rent and costumes." />
      <ComingSoon
        icon={ReceiptText}
        title="Expenses module coming soon"
        description="Studio rent, instructor fees, costumes, and other expenses will appear here."
      />
    </div>
  );
}
