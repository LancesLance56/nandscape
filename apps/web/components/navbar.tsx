"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/auth-status";

const links = [
  { label: "Home", href: "/" },
  { label: "Puzzles", href: "/puzzles" },
  { label: "Sandbox", href: "/nandbox" },
  { label: "Blog", href: "/blog" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <nav className="grid h-16 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center rounded-full border bg-surface-card/85 px-6 shadow-xl backdrop-blur-md transition-all duration-300 will-change-transform sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start">
          <div className="w-38 md:w-48 lg:w-56">
            <LogoIcon />
          </div>
        </Link>

        <div className="hidden items-center gap-8 justify-self-center md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1.5 text-base font-bold transition-colors ${
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

        <div className="flex items-center gap-5 justify-self-end">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </nav>
    </header>
  );
}