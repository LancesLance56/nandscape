"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";

/**
 * The shared shell for logging in and signing up.
 *
 * Adapted from Watermelon UI's auth-03 block: a single card, the social
 * provider above the fold, a labelled rule, then inputs that carry their own
 * icon and a password field you can unmask. What came across is the layout and
 * the affordances. The look did not: the block is square-cornered and uses its
 * own spacing scale, so the corners, borders and type here are the site's.
 *
 * Colour needed no work at all. The block is written against the shadcn
 * semantic classes (`bg-card`, `text-muted-foreground`, `border-primary`), and
 * globals.css already points those at the real palette (`--primary` is
 * `--copper`, `--background` is `--surface`), so it came out copper and sage
 * on the first render.
 *
 * Both pages render this and pass their own fields in, which is why the tab
 * strip is two links rather than a Tabs component: /login and /signup are
 * separate routes and should stay that way for bookmarks and for the OAuth
 * error redirect.
 */

export function AuthCard({
  mode,
  title,
  error,
  submitting,
  submitLabel,
  onSubmit,
  children,
}: {
  mode: "login" | "signup";
  title: string;
  error?: string | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (event: React.FormEvent) => void;
  /** The fields above the submit button. */
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)]">
        {/* Two routes, shown as one control. An active tab is a plain span so
            the current page is not a link to itself. */}
        <div className="grid grid-cols-2 border-b border-border bg-surface-2">
          <AuthTab href="/login" active={mode === "login"}>
            Log in
          </AuthTab>
          <AuthTab href="/signup" active={mode === "signup"}>
            Sign up
          </AuthTab>
        </div>

        <div className="p-6">
          <h1 className="font-display text-xl font-bold text-ink">{title}</h1>

          <a
            href="/api/auth/google"
            className="mt-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-surface-2"
          >
            <GoogleMark />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="shrink-0 text-[11px] text-slate">or with email</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {children}

            {error && (
              <p role="alert" className="text-sm text-signal-coral">
                {error}
              </p>
            )}

            <Button type="submit" variant="default" size="app-lg" disabled={submitting} className="w-full gap-2">
              {submitting ? `${submitLabel}…` : submitLabel}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AuthTab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  const className = cn(
    "py-3 text-center text-sm font-semibold transition-colors",
    active ? "bg-surface-card text-ink" : "text-slate hover:text-ink",
  );

  return active ? (
    <span aria-current="page" className={className}>
      {children}
    </span>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

const ICONS = { mail: Mail, lock: Lock, user: User } as const;

/** A labelled input with its icon inside the field, as in the source block. */
export function AuthField({
  id,
  label,
  icon,
  trailing,
  className,
  ...props
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Slot for the password unmask button, which sits over the right edge. */
  trailing?: ReactNode;
}) {
  const Icon = ICONS[icon];

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-ink-soft">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
        <Input
          id={id}
          className={cn("h-11 rounded-xl pl-10", trailing && "pr-10", className)}
          {...props}
        />
        {trailing}
      </div>
    </div>
  );
}

/** The password field, with the unmask toggle wired up. */
export function AuthPasswordField({
  id,
  label,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { id: string; label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      id={id}
      label={label}
      icon="lock"
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // The label says what pressing it does, not what the state is; a
          // screen reader user is told the field's type either way.
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate transition-colors hover:text-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
}

/** Google's mark, inline rather than pulling in react-icons for one glyph
 *  (the source block imports it from there; this project uses lucide, which
 *  has no brand icons). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
