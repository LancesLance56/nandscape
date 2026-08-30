import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getUserPreferences,
  sanitizePreferences,
  saveUserPreferences,
} from "@/lib/account/preferences";

/**
 * The reader's own dashboard settings.
 *
 * There is no id in the path and no way to name another user: both handlers
 * read the id off the session. A preferences endpoint that took a user id
 * would need an authorisation check on every request, and the check that is
 * never written is the one that cannot be forgotten.
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return NextResponse.json({ preferences: await getUserPreferences(user.id) });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = sanitizePreferences(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No recognised preferences in body" }, { status: 422 });
  }

  try {
    return NextResponse.json({ preferences: await saveUserPreferences(user.id, patch) });
  } catch (error) {
    console.error("[account] preference save failed", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
