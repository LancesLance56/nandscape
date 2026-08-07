import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers, updateUserRole, EmailAlreadyExistsError, UsernameAlreadyExistsError } from "@repo/auth";
import { validateSignupInput } from "@/lib/auth/validation";

// Creates the first ADMIN account on a fresh install. Deliberately has no
// auth check of its own - instead it only ever succeeds while the Users
// table is empty, which is the one moment no session could exist to gate it
// with anyway. On any already-initialized deployment this always 403s, so
// it's safe to leave reachable permanently rather than needing to be
// removed/disabled after first use.
export async function POST(request: NextRequest) {
  const existing = await listUsers();
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already initialized" }, { status: 403 });
  }

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
    const admin = await updateUserRole(user.id, "ADMIN");
    return NextResponse.json({ user: admin }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError || error instanceof UsernameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[admin] bootstrap failed", error);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}
