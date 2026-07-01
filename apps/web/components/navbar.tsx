"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Home", href: "/" },
  { label: "Puzzles", href: "/puzzles" },
  { label: "Nandbox Editor", href: "/nandbox" },
  { label: "Learn", href: "/learn" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-19 items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <Logo className="h-7.5 w-7.5 text-ink" />
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Nandscape
        </span>
      </Link>

      <div className="hidden items-center gap-8.5 md:flex">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "text-ink"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {link.label}

              {active && (
                <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-copper" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-5">
        <ThemeToggle />

        <Link
          href="/login"
          className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:block"
        >
          Log in
        </Link>

        <Button variant="primary" size="sm">
          Start solving
        </Button>
      </div>
    </nav>
  );
}