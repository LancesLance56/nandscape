import { NextRequest, NextResponse } from "next/server";
import { changeUserPassword, InvalidCredentialsError } from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { validateChangePasswordInput } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateChangePasswordInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  try {
    await changeUserPassword(user.id, validation.data.currentPassword, validation.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    console.error("[auth] password change failed", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
