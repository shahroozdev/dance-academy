"use client";

import { ChevronDown, ChevronRight, MessageCircle, Receipt, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { AdjustmentModal } from "@/app/admin/(dashboard)/billing/adjustment-modal";
import { NotificationModal } from "@/app/admin/(dashboard)/billing/notification-modal";
import { PaymentModal } from "@/app/admin/(dashboard)/billing/payment-modal";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const STATUS_OPTIONS = ["UNPAID", "PARTIAL", "PAID", "OVERPAID"] as const;
type StatusValue = (typeof STATUS_OPTIONS)[number];

const STATUS_BADGE_VARIANT: Record<StatusValue, "default" | "secondary" | "destructive" | "outline"> = {
  UNPAID: "destructive",
  PARTIAL: "secondary",
  PAID: "default",
  OVERPAID: "outline",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function BillingPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [visibleStatuses, setVisibleStatuses] = useState<Set<StatusValue>>(
    new Set<StatusValue>(["UNPAID", "PARTIAL", "OVERPAID"]),
  );
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [adjustingBillingId, setAdjustingBillingId] = useState<string | null>(null);
  const [payingBillingId, setPayingBillingId] = useState<string | null>(null);
  const [notifyingFamilyId, setNotifyingFamilyId] = useState<string | null>(null);
  const [generateSummary, setGenerateSummary] = useState<string | null>(null);

  const { data, isLoading } = useQuery("getMonthlyBillings", [{ month }]);
  const { mutate: generate, isLoading: isGenerating } = useMutate("generateMonthlyBilling", {
    invalidateKeys: ["getMonthlyBillings"],
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.data.filter((b) => {
      if (!visibleStatuses.has(b.status as StatusValue)) return false;
      if (term && !b.studentName.toLowerCase().includes(term) && !b.familyName.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [data, visibleStatuses, search]);

  const families = useMemo(() => {
    const map = new Map<string, { familyId: string; familyName: string; bills: typeof filtered }>();
    for (const bill of filtered) {
      if (!map.has(bill.familyId)) {
        map.set(bill.familyId, { familyId: bill.familyId, familyName: bill.familyName, bills: [] });
      }
      map.get(bill.familyId)!.bills.push(bill);
    }
    return [...map.values()].sort((a, b) => a.familyName.localeCompare(b.familyName));
  }, [filtered]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, b) => ({
          due: acc.due + b.finalAmountDue,
          collected: acc.collected + b.amountPaid,
          outstanding: acc.outstanding + b.balance,
        }),
        { due: 0, collected: 0, outstanding: 0 },
      ),
    [filtered],
  );

  const toggleStatus = (status: StatusValue) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        subtitle="Generate and review monthly student billing."
        actions={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button
              disabled={isGenerating}
              onClick={async () => {
                const summary = await generate(month);
                setGenerateSummary(
                  `${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped (already has payments).`,
                );
              }}
            >
              <RefreshCw className={isGenerating ? "size-4 animate-spin" : "size-4"} />
              {isGenerating ? "Generating..." : `Generate Bills for ${formatMonthLabel(month)}`}
            </Button>
          </div>
        }
      />

      {generateSummary && (
        <div className="rounded-md border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">{generateSummary}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card contentClassName="p-4">
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.due)}</p>
        </Card>
        <Card contentClassName="p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.collected)}</p>
        </Card>
        <Card contentClassName="p-4">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.outstanding)}</p>
        </Card>
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Monthly Student Billing</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-2">
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={visibleStatuses.has(status) ? "default" : "outline"}
              onClick={() => toggleStatus(status)}
            >
              {status}
            </Button>
          ))}
          <input
            type="text"
            placeholder="Search student or family..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto flex h-8 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && families.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Receipt className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No bills match the current filters for {formatMonthLabel(month)}.
            </p>
          </div>
        )}
        {!isLoading && families.length > 0 && (
          <div className="divide-y">
            {families.map((family) => {
              const isExpanded = expandedFamilies.has(family.familyId);
              const familyTotal = family.bills.reduce((sum, b) => sum + b.finalAmountDue, 0);
              return (
                <div key={family.familyId}>
                  <div className="flex w-full items-center justify-between gap-2 p-3 hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => toggleFamily(family.familyId)}
                      className="flex flex-1 items-center gap-2 text-left font-medium"
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      {family.familyName}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({family.bills.length} student{family.bills.length > 1 ? "s" : ""})
                      </span>
                    </button>
                    <Button size="sm" variant="outline" onClick={() => setNotifyingFamilyId(family.familyId)}>
                      <MessageCircle className="size-4" />
                      Notify
                    </Button>
                    <span className="font-medium">{formatCurrency(familyTotal)}</span>
                  </div>
                  {isExpanded && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Classes</TableHead>
                          <TableHead>Multi-Class Disc.</TableHead>
                          <TableHead>Sibling Disc.</TableHead>
                          <TableHead>Adjustment</TableHead>
                          <TableHead>Final Amount Due</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {family.bills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium">
                              <Link href={`/admin/billing/${bill.id}`} className="hover:underline">
                                {bill.studentName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {bill.classNames.join(", ") || "—"}
                            </TableCell>
                            <TableCell>
                              {bill.multiClassDiscount > 0 ? `-${formatCurrency(bill.multiClassDiscount)}` : "—"}
                            </TableCell>
                            <TableCell>
                              {bill.siblingDiscount > 0 ? `-${formatCurrency(bill.siblingDiscount)}` : "—"}
                            </TableCell>
                            <TableCell>{bill.adjustment !== 0 ? formatCurrency(bill.adjustment) : "—"}</TableCell>
                            <TableCell className="text-base font-semibold">
                              {formatCurrency(bill.finalAmountDue)}
                            </TableCell>
                            <TableCell>{formatCurrency(bill.amountPaid)}</TableCell>
                            <TableCell>{formatCurrency(bill.balance)}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_BADGE_VARIANT[bill.status as StatusValue]}>{bill.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setAdjustingBillingId(bill.id)}>
                                  Adjust
                                </Button>
                                {bill.status !== "PAID" && (
                                  <Button size="sm" onClick={() => setPayingBillingId(bill.id)}>
                                    Record Payment
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {adjustingBillingId && (
        <AdjustmentModal billingId={adjustingBillingId} onClose={() => setAdjustingBillingId(null)} />
      )}
      {payingBillingId && <PaymentModal billingId={payingBillingId} onClose={() => setPayingBillingId(null)} />}
      {notifyingFamilyId && (
        <NotificationModal familyId={notifyingFamilyId} month={month} onClose={() => setNotifyingFamilyId(null)} />
      )}
    </div>
  );
}
