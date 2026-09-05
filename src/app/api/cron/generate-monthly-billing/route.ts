import { NextResponse } from "next/server";

import { generateMonthlyBilling } from "@/actions/billing";
import { normalizeMonth } from "@/lib/billing";
import { isCronAuthorized } from "@/lib/cron-auth";

// Scheduled for the 1st of each month (see vercel.json). Generates bills for the current month —
// idempotent (§4.5): re-running it never touches a bill that already has a payment against it.
// Exported as both GET and POST since Vercel Cron's invocation method depends on how the job was
// configured (vercel.json `crons` vs. the newer Cron primitive).
async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = normalizeMonth(new Date()).toISOString();

  try {
    const summary = await generateMonthlyBilling(month);
    // Logged, not emailed (§4.5) — the admin reviews results in /admin/billing, not an inbox.
    console.warn("[cron] generate-monthly-billing:", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[cron] generate-monthly-billing failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
