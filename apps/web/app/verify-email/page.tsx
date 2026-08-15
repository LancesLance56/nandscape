import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { consumeEmailVerificationToken, InvalidVerificationTokenError } from "@repo/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let heading: string;
  let message: string;

  if (!token) {
    heading = "Missing verification link";
    message = "This page needs a verification token,  use the link from your email.";
  } else {
    try {
      await consumeEmailVerificationToken(token);
      heading = "Email verified";
      message = "Your email is confirmed. You're all set.";
    } catch (error) {
      const invalid = error instanceof InvalidVerificationTokenError;
      heading = invalid ? "Link expired or already used" : "Something went wrong";
      message = invalid
        ? "This verification link is invalid or has expired,  request a new one from your account page."
        : "We couldn't verify your email right now,  try again in a moment.";
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <h1 className="mb-2 font-display text-2xl font-bold text-ink">{heading}</h1>
        <p className="mb-6 text-sm text-ink-soft">{message}</p>
        <Link
          href="/account"
          className="rounded-xl bg-copper px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-copper-dark"
        >
          Go to account
        </Link>
      </main>
    </>
  );
}
