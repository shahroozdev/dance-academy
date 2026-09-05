import { NextResponse } from "next/server";

import { sendPaymentReminders } from "@/actions/reminders";
import { isCronAuthorized } from "@/lib/cron-auth";

// Scheduled to run daily (see vercel.json). Finds bills past their configured due date + reminder
// window (§5.4) and emails a combined reminder per family, once per bill (see reminders.ts).
async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sendPaymentReminders();
    console.warn("[cron] send-payment-reminders:", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron] send-payment-reminders failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
