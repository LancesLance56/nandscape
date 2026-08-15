import { NextRequest, NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
  updateUserProfile,
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
} from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { validateUpdateProfileInput } from "@/lib/auth/validation";
import { siteUrl } from "@/lib/site-url";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateUpdateProfileInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  try {
    const updated = await updateUserProfile(user.id, validation.data);

    // Email changed and now needs its own confirmation - same best-effort
    // send as signup (see app/api/auth/signup/route.ts), a Resend hiccup
    // shouldn't fail the profile update itself.
    if (validation.data.email !== undefined && !updated.emailVerified) {
      try {
        const token = await createEmailVerificationToken(updated.id);
        await sendVerificationEmail(updated.email, `${siteUrl()}/verify-email?token=${token}`);
      } catch (emailError) {
        console.error("[auth] failed to send verification email", emailError);
      }
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError || error instanceof UsernameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[auth] profile update failed", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
