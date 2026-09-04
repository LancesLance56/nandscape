import Link from "next/link";
import { ChevronLeft, List } from "lucide-react";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/auth-status";

/**
 * The slim bar the coding *workspace* uses in place of the site navbar.
 *
 * Two reasons it exists rather than reusing <Navbar />. Height: the main bar is
 * 5rem and carries eight section links, which is right for browsing the site
 * and wrong above a workspace where every vertical pixel belongs to the editor.
 * And focus: someone mid-problem needs a way back and nothing else, so offering
 * them Flowcharts and Embeds is just an invitation to lose their work.
 *
 * Only /practices/[slug] uses it. The catalogue at /practices is an ordinary
 * site page and carries the ordinary navbar, because browsing is not the thing
 * that needs the vertical space back.
 *
 * 3rem tall, full-bleed, and a server component - it holds no state of its own,
 * unlike the main navbar with its mobile dropdown.
 */
export function PracticeNav({ problemTitle }: { problemTitle?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-12 border-b border-border bg-surface/95 backdrop-blur-md">
      <nav className="flex h-12 w-full items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-ink transition-opacity hover:opacity-70"
          aria-label="Nandscape home"
        >
          <Logo className="h-5 w-5 shrink-0" />
          <span className="hidden text-sm font-bold sm:inline">Nandscape</span>
        </Link>

        <span aria-hidden className="h-4 w-px shrink-0 bg-border" />

        {/* On a problem page this is the way back to the list, which is the one
            navigation people actually reach for; on the list itself the same
            slot names where they are. */}
        {problemTitle ? (
          <Link
            href="/practices"
            className="flex min-w-0 shrink items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Problems</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <List className="h-3.5 w-3.5" />
            Problems
          </span>
        )}

        {problemTitle && (
          <span className="min-w-0 truncate text-sm font-medium text-ink">{problemTitle}</span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <AuthStatus variant="inline" />
        </div>
      </nav>
    </header>
  );
}
