import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSession, InvalidCredentialsError } from "@repo/auth";
import { setSessionCookie } from "@/lib/auth/cookies";
import { validateLoginInput } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateLoginInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  try {
    const user = await authenticateUser(validation.data.email, validation.data.password);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[auth] login failed", error);
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 });
  }
}