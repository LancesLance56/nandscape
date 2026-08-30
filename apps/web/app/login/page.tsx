"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AuthCard, AuthField, AuthPasswordField } from "@/components/auth/auth-card";

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
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 pb-24 pt-32">
        <AuthCard
          mode="login"
          title="Welcome back"
          error={error}
          submitting={submitting}
          submitLabel="Log in"
          onSubmit={handleSubmit}
        >
          <AuthField
            id="login-email"
            label="Email"
            icon="mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <AuthPasswordField
            id="login-password"
            label="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthCard>
      </main>
    </>
  );
}
