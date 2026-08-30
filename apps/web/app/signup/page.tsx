"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AuthCard, AuthField, AuthPasswordField } from "@/components/auth/auth-card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Failed to create account");
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
          mode="signup"
          title="Create your account"
          error={error}
          submitting={submitting}
          submitLabel="Create account"
          onSubmit={handleSubmit}
        >
          <AuthField
            id="signup-email"
            label="Email"
            icon="mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <AuthField
            id="signup-username"
            label="Username"
            icon="user"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <AuthPasswordField
            id="signup-password"
            label="Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <AuthPasswordField
            id="signup-confirm-password"
            label="Confirm password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </AuthCard>
      </main>
    </>
  );
}
