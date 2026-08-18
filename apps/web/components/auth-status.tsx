"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CurrentUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7.2" r="3.2" />
      <path d="M3.5 17c1.1-3.5 3.9-5.2 6.5-5.2s5.4 1.7 6.5 5.2" />
    </svg>
  );
}

/**
 * "compact" (default) is the pill-navbar rendering,  hidden entirely below
 * md by navbar.tsx's own wrapper, so on mobile there's nothing to conflict
 * with. "menu" is the stacked-link rendering used inside the navbar's
 * mobile dropdown instead: logged-out only (Log in / Start solving), since
 * a logged-in user's avatar (still shown directly in the pill on every
 * breakpoint) already opens its own Account/Log out menu - duplicating
 * that inside the hamburger dropdown too would just be the same two
 * actions in two places.
 */
export function AuthStatus({ variant = "compact" }: { variant?: "compact" | "menu" } = {}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    // Sized for whichever outcome actually lands: the avatar (h-9 w-9,
    // every breakpoint) or the wider logged-out buttons (md+ only, see
    // below) - avoids a layout pop once /api/auth/me resolves.
    return variant === "compact" ? <div className="h-9 w-9 md:w-20" aria-hidden="true" /> : null;
  }

  if (!user) {
    if (variant === "menu") {
      return (
        <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-copper px-3 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-copper-dark"
          >
            Start solving
          </Link>
        </div>
      );
    }

    return (
      <div className="hidden items-center gap-5 md:flex">
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Log in
        </Link>
        <Button variant="default" size="app" onClick={() => router.push("/signup")}>
          Start solving
        </Button>
      </div>
    );
  }

  if (variant === "menu") return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-strong text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external (Google-hosted) avatar, not worth a next.config remotePatterns entry for a 36px icon
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserIcon />
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border bg-surface-card/95 p-1.5 shadow-xl backdrop-blur-md">
          <p className="truncate px-2.5 py-1.5 text-[11px] font-semibold text-slate">{user.username}</p>
          <Link
            href="/account"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-signal-coral disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}