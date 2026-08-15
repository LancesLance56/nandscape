import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Nandscape <onboarding@resend.dev>";

/**
 * `verifyUrl` is built by the caller (apps/web, from SITE_URL) - this
 * package has no Next.js request context of its own to derive it from.
 * Silently logs instead of sending when RESEND_API_KEY isn't set, so local
 * dev and CI don't need a real API key just to exercise the signup flow.
 */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set,  would send verification link to ${to}: ${verifyUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your Nandscape email",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Confirm your email</h1>
        <p>Click the link below to verify your Nandscape account. This link expires in 24 hours.</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; background: #c2683a; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Verify email
          </a>
        </p>
        <p style="color: #888; font-size: 13px;">If you didn't create a Nandscape account, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
