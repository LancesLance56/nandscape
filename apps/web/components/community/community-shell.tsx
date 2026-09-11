import type { ReactNode } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/cn";

/**
 * The frame the four community pages share: the site chrome, a page head, and
 * one row of tabs between them.
 *
 * The tabs are plain links with the active one passed in rather than derived
 * from `usePathname`, which keeps every one of these pages a server component.
 */

const TABS = [
  { id: "hub", label: "Overview", href: "/community" },
  { id: "discussions", label: "Discussions", href: "/community/discussions" },
  { id: "board", label: "Leaderboard", href: "/community/leaderboard" },
  { id: "circuits", label: "Circuits", href: "/community/circuits" },
] as const;

export type CommunityTab = (typeof TABS)[number]["id"];

export function CommunityShell({
  active,
  eyebrow,
  title,
  intro,
  children,
  action,
  wide = false,
}: {
  active: CommunityTab;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  /** Optional primary action, rendered beside the page title. */
  action?: ReactNode;
  /** The hub and the circuits grid use the full app width; the rest read narrower. */
  wide?: boolean;
}) {
  return (
    <>
      <Navbar />
      <main className={cn("mx-auto px-6 pb-24 pt-32 sm:px-10", wide ? "max-w-330" : "max-w-5xl")}>
        <div className="mb-7 flex items-center gap-6 border-b border-border">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm transition-colors",
                tab.id === active
                  ? "border-copper font-semibold text-ink"
                  : "border-transparent font-medium text-ink-soft hover:text-ink",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate">
              {eyebrow}
            </p>
            <h1 className="mb-2.5 font-display text-2xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            {intro && <p className="text-sm leading-relaxed text-ink-soft">{intro}</p>}
          </div>
          {action}
        </div>

        {children}
      </main>
      <Footer />
    </>
  );
}

/** The small heading + "see all" link that sits above each rail. */
export function SectionHead({
  title,
  action,
  note,
}: {
  title: string;
  action?: { label: string; href: string };
  note?: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-copper-dark hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {note && <p className="mt-1 text-[13px] text-slate">{note}</p>}
    </div>
  );
}
