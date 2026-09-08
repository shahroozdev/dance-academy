"use client";

import { ClipboardList } from "lucide-react";
import { useState, type ReactNode } from "react";

import { RegistrationApprovalForm } from "@/app/admin/(dashboard)/registrations/registration-approval-form";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { useQuery } from "@/hooks/useQuery";

const STATUS_TABS = [
  { label: "Pending", value: "PENDING" },
  { label: "Processed", value: "PROCESSED" },
  { label: "Rejected", value: "REJECTED" },
] as const;

type StatusValue = (typeof STATUS_TABS)[number]["value"];

const STATUS_BADGE_VARIANT: Record<StatusValue, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  PROCESSED: "default",
  REJECTED: "destructive",
};

export default function RegistrationsPage() {
  const [status, setStatus] = useState<StatusValue>("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery("getRegistrationRequests", [{ status, page, pageSize }]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registration Requests"
        subtitle="Review new registration requests and match them to families and classes."
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Requests</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex min-h-0 flex-1 flex-col p-2"
      >
        <div className="flex items-center gap-1 p-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={status === tab.value ? "default" : "outline"}
              onClick={() => { setStatus(tab.value); setPage(1); }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && !data?.data.length && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ClipboardList className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No {status.toLowerCase()} registration requests.
            </p>
          </div>
        )}
        {!isLoading && data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent/Guardian</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Requested Class</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.parentGuardianName}</TableCell>
                  <TableCell>{request.studentFullName}</TableCell>
                  <TableCell>{request.requestedClass?.name ?? "—"}</TableCell>
                  <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[request.status]}>{request.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === "PENDING" && (
                      <TooltipWrapper label="Review registration request">
                        <Button size="sm" variant="outline" onClick={() => setReviewingId(request.id)}>
                          Review
                        </Button>
                      </TooltipWrapper>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            pages={data.pages}
            itemLabel="requests"
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      {reviewingId && <ReviewModal id={reviewingId} onClose={() => setReviewingId(null)} />}
    </div>
  );
}

function ReviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: request, isLoading: isLoadingRequest } = useQuery("getRegistrationRequestById", [id]);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      className="max-w-lg"
      title={
        <div>
          Review Registration
          <p className="text-sm font-normal text-muted-foreground">
            Confirm the details before creating/matching family, student, and enrollment records.
          </p>
        </div>
      }
    >
      {({ close }) => (
        <div className="space-y-4">
          {isLoadingRequest || !request ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-3 text-sm">
              <Section title="Parent / Guardian">
                <Row label="Name" value={request.parentGuardianName} />
                <Row label="Email" value={request.parentEmail ?? "—"} />
                <Row label="Phone" value={request.parentPhone} />
              </Section>
              <Section title="Student">
                <Row label="Name" value={request.studentFullName} />
                <Row
                  label="DOB"
                  value={request.dob ? new Date(request.dob).toLocaleDateString() : "—"}
                />
                <Row label="Gender" value={request.gender?.replace("_", " ") ?? "—"} />
                <Row label="Requested Class" value={request.requestedClass?.name ?? "—"} />
                <Row label="Previous Experience" value={request.previousDanceExperience || "—"} />
              </Section>
              <Section title="Emergency Contact">
                <Row label="Name" value={request.emergencyContactName} />
                <Row label="Relationship" value={request.emergencyContactRelationship} />
                <Row label="Phone" value={request.emergencyPhone} />
              </Section>
              <Section title="Consent">
                <Row
                  label="Studio Policy Agreement"
                  value={request.studioPolicyAgreement ? "Agreed" : "Not agreed"}
                />
                <Row
                  label="Photo/Video Consent"
                  value={request.photoVideoConsent ? "Consented" : "Not consented"}
                />
              </Section>

            </div>
          )}

          {request && <RegistrationApprovalForm id={id} onClose={close} />}
        </div>
      )}
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1 border-t pt-2 first:border-t-0 first:pt-0">
      <p className="font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
