import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser, EmailAlreadyExistsError, UsernameAlreadyExistsError } from "@repo/auth";
import { setSessionCookie } from "@/lib/auth/cookies";
import { validateSignupInput } from "@/lib/auth/validation";

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
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError || error instanceof UsernameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[auth] signup failed", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}