import { NextResponse } from "next/server";
import { createEmailVerificationToken, sendVerificationEmail, VerificationCooldownError } from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { siteUrl } from "@/lib/site-url";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ error: "Email is already verified" }, { status: 409 });

  try {
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, `${siteUrl()}/verify-email?token=${token}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof VerificationCooldownError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("[auth] failed to resend verification email", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
