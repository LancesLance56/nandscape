"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CurrentUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

export function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setUser(body.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  if (user === undefined) {
    return <div className="h-9 w-20" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          Log in
        </Link>
        <Button variant="primary" size="sm" onClick={() => router.push("/signup")}>
          Start solving
        </Button>
      </>
    );
  }

  return (
    <>
      <span className="hidden text-sm font-medium text-ink-soft sm:block">{user.username}</span>
      <Button variant="secondary" size="sm" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "…" : "Log out"}
      </Button>
    </>
  );
}