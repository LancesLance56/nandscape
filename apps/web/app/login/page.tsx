"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Populated by /api/auth/google/callback redirecting back here on failure.
  // Read from window.location rather than useSearchParams() so this page can
  // stay a plain client component without a Suspense boundary.
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) setError(message);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Failed to log in");
        return;
      }

      router.push("/puzzles");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 pb-24 pt-32">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink">Log in</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper"
            />
          </label>

          {error && <p className="text-sm text-signal-coral">{error}</p>}

          <Button type="submit" variant="primary" size="lg" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <a
          href="/api/auth/google"
          className="rounded-xl border border-border-strong bg-transparent px-7 py-3.5 text-center text-base font-semibold text-ink transition-colors hover:border-ink-soft"
        >
          Continue with Google
        </a>

        <p className="mt-4 text-sm text-ink-soft">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-copper hover:text-copper-dark">
            Sign up
          </Link>
        </p>
      </main>
    </>
  );
}