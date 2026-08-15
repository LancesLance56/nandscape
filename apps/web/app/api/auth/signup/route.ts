import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  createSession,
  createUser,
  sendVerificationEmail,
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from "@repo/auth";
import { setSessionCookie } from "@/lib/auth/cookies";
import { validateSignupInput } from "@/lib/auth/validation";
import { siteUrl } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateSignupInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  try {
    const user = await createUser(validation.data);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    // Best-effort: a Resend outage shouldn't fail account creation itself,
    // the user can always hit "resend" from the account page afterward.
    try {
      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, `${siteUrl()}/verify-email?token=${token}`);
    } catch (emailError) {
      console.error("[auth] failed to send verification email", emailError);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError || error instanceof UsernameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[auth] signup failed", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}