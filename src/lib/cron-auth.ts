import { timingSafeEqual } from "crypto";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on scheduled invocations when
// CRON_SECRET is set as a project env var — this mirrors that check for our own /api/cron/*
// routes. timingSafeEqual avoids leaking the secret's length/content via response-time
// differences; lengths are compared first since it throws on mismatched buffer lengths.
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(headerBuf, expectedBuf);
}
