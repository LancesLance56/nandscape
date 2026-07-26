import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProgressForUser } from "@/lib/puzzles/puzzle-progress";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const progress = await listProgressForUser(user.id);
  return NextResponse.json({ progress });
}