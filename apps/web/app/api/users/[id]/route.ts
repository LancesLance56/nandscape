import { NextRequest, NextResponse } from "next/server";
import { updateUserRole, type Role } from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";

const VALID_ROLES: Role[] = ["USER", "ADMIN"];

function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2025";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = (body as Record<string, unknown> | null)?.role;
  if (typeof role !== "string" || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Role must be USER or ADMIN" }, { status: 422 });
  }

  // A demoted admin would immediately lose access to this page mid-session,
  // and if they were the last admin, no one could restore the role.
  if (id === currentUser.id && role !== "ADMIN") {
    return NextResponse.json({ error: "You can't remove your own admin access" }, { status: 422 });
  }

  try {
    const updated = await updateUserRole(id, role as Role);
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[auth] role update failed", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
