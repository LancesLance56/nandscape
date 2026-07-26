import { NextResponse } from "next/server";
import { invalidateSessionToken } from "@repo/auth";
import { clearSessionCookie, readSessionToken } from "@/lib/auth/cookies";

export async function POST() {
  const token = await readSessionToken();
  if (token) await invalidateSessionToken(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}