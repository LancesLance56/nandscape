"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { SidebarNavGroup } from "./dashboard-sidebar";
import { isActive } from "./nav";

/**
 * The sticky bar across the top of the content pane.
 *
 * Watermelon's version carried a breadcrumb, a project switcher and a theme
 * menu. The switcher is gone - Nandscape has no per-project scoping above the
 * dashboard, and a control that only ever holds one value is furniture. The
 * breadcrumb stays, reading the current page out of the same nav tree the
 * sidebar renders so the two can never disagree, and the theme control is the
 * site's own toggle rather than the template's three-way menu.
 */

export interface DashboardTopbarProps {
  areaLabel: string;
  areaRoot: string;
  groups: SidebarNavGroup[];
  /** Rendered on the right, before the theme toggle - a page-level action, when
   *  the page has one. */
  actions?: React.ReactNode;
}

export function DashboardTopbar({ areaLabel, areaRoot, groups, actions }: DashboardTopbarProps) {
  const pathname = usePathname();
  const items = groups.flatMap((group) => group.items);

  // Longest match wins. `/account/settings` and `/account/settings/security`
  // both prefix-match the security page; sorting by href length first means the
  // crumb names the page you are actually on rather than its parent.
  const current =
    [...items]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => !item.external && isActive(pathname, item.href, areaRoot)) ?? items[0];

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-card px-4 md:h-16 md:px-6">
      <div className="flex min-w-0 items-center gap-1">
        <SidebarTrigger className="size-9 md:hidden [&_svg]:size-5!" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link href={areaRoot} className="shrink-0 text-slate transition-colors hover:text-copper-dark">
            {areaLabel}
          </Link>
          {current && current.href !== areaRoot && (
            <>
              <span aria-hidden className="text-border-strong">
                /
              </span>
              <span className="truncate font-medium text-ink">{current.label}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
