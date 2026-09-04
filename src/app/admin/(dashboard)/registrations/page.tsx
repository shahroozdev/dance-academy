"use client";

import { ClipboardList } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutate } from "@/hooks/useMutate";
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

  const { data, isLoading } = useQuery("getRegistrationRequests", [{ status, pageSize: 50 }]);

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
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ClipboardList className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No {status.toLowerCase()} registration requests.
            </p>
          </div>
        ) : (
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
                      <Button size="sm" variant="outline" onClick={() => setReviewingId(request.id)}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {reviewingId && <ReviewModal id={reviewingId} onClose={() => setReviewingId(null)} />}
    </div>
  );
}

function ReviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: request, isLoading: isLoadingRequest } = useQuery("getRegistrationRequestById", [id]);
  const { data: plan, isLoading: isLoadingPlan } = useQuery("previewRegistrationApproval", [id]);

  const {
    mutate: approve,
    isLoading: isApproving,
    error: approveError,
  } = useMutate("approveRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests", "getFamilies", "getStudents", "getEnrollments"],
    onSuccess: onClose,
  });
  const { mutate: reject, isLoading: isRejecting } = useMutate("rejectRegistrationRequest", {
    invalidateKeys: ["getRegistrationRequests"],
    onSuccess: onClose,
  });

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-lg">
      {({ close }) => (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Review Registration</h3>
            <p className="text-sm text-muted-foreground">
              Confirm the details before creating/matching family, student, and enrollment records.
            </p>
          </div>

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

              {!isLoadingPlan && plan && (
                <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                  <p className="font-medium text-foreground">On approval:</p>
                  <p>
                    Family —{" "}
                    {plan.family.action === "match"
                      ? `match existing "${plan.family.name}"`
                      : `create new "${plan.family.name}"`}
                  </p>
                  <p>
                    Student —{" "}
                    {plan.student.action === "match"
                      ? "match existing student in that family"
                      : "create new student"}
                  </p>
                </div>
              )}
            </div>
          )}

          {Boolean(approveError) && (
            <p className="text-sm text-destructive">
              Could not approve this request. It may have already been processed.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={close} disabled={isApproving || isRejecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => reject(id)} disabled={isApproving || isRejecting}>
              {isRejecting ? "Rejecting..." : "Reject"}
            </Button>
            <Button onClick={() => approve(id)} disabled={isApproving || isRejecting || !request}>
              {isApproving ? "Approving..." : "Approve & Process"}
            </Button>
          </div>
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
