"use client";

import { Check, Copy, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export function NotificationModal({
  familyId,
  month,
  onClose,
}: {
  familyId: string;
  month: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { data: preview, isLoading } = useQuery("getFamilyNotificationPreview", [familyId, month]);

  const { mutate: markSent, isLoading: isMarking } = useMutate("markFamilyNotificationSent", {
    invalidateKeys: ["getMonthlyBillings", "getPendingNotifications", "getNotificationLogs"],
    onSuccess: onClose,
  });
  const {
    mutate: sendEmail,
    isLoading: isSendingEmail,
    error: sendEmailError,
  } = useMutate("sendFamilyNotificationEmail", {
    invalidateKeys: ["getMonthlyBillings", "getPendingNotifications", "getNotificationLogs"],
  });
  const [emailResult, setEmailResult] = useState<{ sent: boolean; error?: string } | null>(null);
  const { mutate: sendWhatsApp, isLoading: isSendingWhatsApp, error: whatsappError } = useMutate("sendFamilyNotificationWhatsApp", {
    invalidateKeys: ["getMonthlyBillings", "getPendingNotifications", "getNotificationLogs", "getAdminNotificationSummary"],
  });
  const [whatsappResult, setWhatsappResult] = useState<{ sent: boolean; error?: string } | null>(null);
  const { mutate: sendReminder, isLoading: isSendingReminder, error: reminderError } = useMutate("sendFamilyPaymentReminder", {
    invalidateKeys: ["getNotificationLogs", "getAdminNotificationSummary"],
  });
  const [reminderResult, setReminderResult] = useState<{ sent: boolean; error?: string } | null>(null);

  const copyMessage = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendViaEmail = async () => {
    setEmailResult(null);
    const result = await sendEmail(familyId, month);
    setEmailResult(result);
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} className="max-w-md">
      {({ close }) => (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Send Notification</h3>
            <p className="text-sm text-muted-foreground">
              Send through the studio&apos;s WhatsApp account or email, or open WhatsApp to send manually.
            </p>
          </div>

          {isLoading || !preview ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium">{preview.familyName}</span> — {preview.phone}
                {preview.email && <> · {preview.email}</>}
                {preview.alreadySent && (
                  <span className="ml-2 text-xs text-muted-foreground">(already marked sent)</span>
                )}
              </p>

              {!preview.finalized && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Finalize this month&apos;s billable session count for{" "}
                  <span className="font-medium">{preview.unfinalizedClassNames.join(", ")}</span> on the{" "}
                  <a href="/admin/class-fees" className="underline">Class Monthly Fees</a> page before sending.
                </p>
              )}

              <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{preview.message}</pre>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={isSendingReminder || !preview.finalized} onClick={async () => {
                  setReminderResult(null);
                  try { setReminderResult(await sendReminder(familyId, month)); } catch { /* The mutation error is displayed below. */ }
                }}>{isSendingReminder ? "Sending..." : "Send Payment Reminder"}</Button>
                <Button type="button" disabled={isSendingWhatsApp || !preview.finalized} onClick={async () => {
                  setWhatsappResult(null);
                  try { setWhatsappResult(await sendWhatsApp(familyId, month)); } catch { /* The mutation error is displayed below. */ }
                }}>
                  <MessageCircle className="size-4" />
                  {isSendingWhatsApp ? "Sending..." : "Send WhatsApp"}
                </Button>
                <Button type="button" variant="outline" onClick={copyMessage}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied!" : "Copy Message"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <a href={preview.waLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" />
                    Open in WhatsApp
                  </a>
                </Button>
                {preview.email && (
                  <Button type="button" variant="outline" disabled={isSendingEmail || !preview.finalized} onClick={sendViaEmail}>
                    <Mail className="size-4" />
                    {isSendingEmail ? "Sending..." : "Send Email"}
                  </Button>
                )}
              </div>

              {reminderResult && <p className={reminderResult.sent ? "text-sm text-primary" : "text-sm text-destructive"}>
                {reminderResult.sent ? "Payment reminder sent." : reminderResult.error}
              </p>}
              {!!reminderError && <p className="text-sm text-destructive">Could not send the payment reminder.</p>}

              {whatsappResult && <p className={whatsappResult.sent ? "text-sm text-primary" : "text-sm text-destructive"}>
                {whatsappResult.sent ? "WhatsApp accepted the message for delivery." : whatsappResult.error}
              </p>}
              {!!whatsappError && <p className="text-sm text-destructive">Could not send WhatsApp. Please try again.</p>}

              {emailResult && (
                <p className={emailResult.sent ? "text-sm text-primary" : "text-sm text-destructive"}>
                  {emailResult.sent
                    ? "Email sent."
                    : `Email not sent${emailResult.error ? `: ${emailResult.error}` : "."}`}
                </p>
              )}
              {Boolean(sendEmailError) && (
                <p className="text-sm text-destructive">Could not send the email. Please try again.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={close}>
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={isMarking || !preview.finalized}
                  onClick={() => markSent(familyId, month, preview.message)}
                >
                  {isMarking ? "Saving..." : "Mark as Sent"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
