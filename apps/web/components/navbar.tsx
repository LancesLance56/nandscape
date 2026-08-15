"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/auth-status";

// "Home" is intentionally omitted,  the logo already links there, so a
// separate text link would just duplicate it and eat width.
const links = [
  { label: "Tutorials", href: "/tutorials" },
  { label: "Puzzles", href: "/puzzles" },
  { label: "Logic Editor", href: "/logic-editor" },
  { label: "Tools", href: "/tools" },
  { label: "Projects", href: "/projects" },
  { label: "Community", href: "/community" },
  { label: "Blog", href: "/blog" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the dropdown whenever navigation happens, whether via a link in it
  // or any other route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-7 w-7 shrink-0 text-ink" />
          <span className="text-lg font-bold text-ink">Nandscape</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4 sm:gap-5">
          <ThemeToggle />
          {/* AuthStatus itself hides its logged-out Log in/Start solving
              buttons below md (they move into the dropdown below
              instead) - the avatar it renders when logged in isn't
              touched by that, so it still shows on every breakpoint. */}
          <AuthStatus />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-border bg-surface p-3 md:hidden">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Log in / Start solving, moved here from the pill (see the
              AuthStatus usage above) - logged-in users don't get
              anything extra here, their avatar's own menu already
              covers Account/Log out, so AuthStatus renders nothing at
              all in that case (no empty divider left behind). */}
          <AuthStatus variant="menu" />
        </div>
      )}
    </header>
  );
}