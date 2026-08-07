"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ProfileFormProps {
  initial: {
    name: string | null;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
}

const inputClass =
  "rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper";

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? "");
  const [username, setUsername] = useState(initial.username);
  const [email, setEmail] = useState(initial.email);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() === "" ? null : name.trim(),
          username,
          email,
          avatarUrl: avatarUrl.trim() === "" ? null : avatarUrl.trim(),
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Failed to update profile");
        return;
      }

      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Username</span>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Avatar URL</span>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-signal-coral">{error}</p>}
      {success && !error && <p className="text-sm text-signal-green">Profile updated.</p>}

      <div>
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
