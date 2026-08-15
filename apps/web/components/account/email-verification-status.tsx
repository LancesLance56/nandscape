"use client";

import { useState } from "react";

export function EmailVerificationStatus({ initial }: { initial: boolean }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (initial) {
    return (
      <p className="mb-4 flex items-center gap-1.5 text-xs font-medium text-signal-green">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
        Email verified
      </p>
    );
  }

  const handleResend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const body = await res.json();
      setMessage(res.ok ? "Verification email sent,  check your inbox." : (body.error ?? "Failed to send verification email"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-copper" />
          Email not verified
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="text-xs font-semibold text-copper hover:text-copper-dark disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend email"}
        </button>
      </div>
      {message && <p className="text-xs text-ink-soft">{message}</p>}
    </div>
  );
}
