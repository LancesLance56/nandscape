"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo, LogoIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/auth-status";

// "Home" is intentionally omitted,  the logo already links there, so a
// separate text link would just duplicate it and eat width.
const links = [
  { label: "Puzzles", href: "/puzzles" },
  { label: "Sandbox", href: "/nandbox" },
  { label: "Community", href: "/community" },
  { label: "Blog", href: "/blog" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "About", href: "/about" },
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
    <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div className="w-full max-w-7xl">
        <nav className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center rounded-full border bg-surface-card/85 px-6 shadow-xl backdrop-blur-md transition-all duration-300 will-change-transform sm:px-10">
          <Link href="/" className="flex items-center gap-2.5 justify-self-start">
            {/* Full wordmark takes up to 224px, too wide once the nav links
                collapse into the hamburger below md, so it shrinks to just
                the mark then. */}
            <Logo className="h-8 w-8 text-ink md:hidden" />
            <div className="hidden md:block md:w-48 lg:w-56">
              <LogoIcon />
            </div>
          </Link>

          <div className="hidden items-center gap-6 justify-self-center md:flex">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1.5 text-sm font-bold transition-colors ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}

                  {active && (
                    <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-copper" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4 justify-self-end sm:gap-5">
            <ThemeToggle />
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
          <div className="mt-2 flex flex-col gap-1 rounded-2xl border bg-surface-card/95 p-3 shadow-xl backdrop-blur-md md:hidden">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}