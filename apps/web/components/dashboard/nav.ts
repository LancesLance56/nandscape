import type { LucideIcon } from "lucide-react";

/**
 * The shape the dashboard sidebar renders.
 *
 * Both dashboards - the reader's and the admin's - are the same shell fed a
 * different tree, so the shell knows nothing about either. The template this
 * came from hard-coded its navigation into the sidebar component alongside a
 * mock user; pulling it out to a prop is what lets one shell serve two areas
 * without a copy.
 */

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rendered on the right of the row. A count, when there is one worth
   *  showing; never a decorative dot. */
  badge?: string | number;
  /** Leaves the dashboard for the main site, so it opts out of the
   *  "is this the current section" matching below. */
  external?: boolean;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

/**
 * Whether a nav row is the page you are on.
 *
 * Prefix matching, so `/account/settings/security` still lights up the
 * Settings row - except for the section root itself, which would otherwise
 * match every page under it and light up two rows at once.
 */
export function isActive(pathname: string, href: string, root: string): boolean {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}
