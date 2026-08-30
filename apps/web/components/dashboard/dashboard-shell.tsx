import type { CSSProperties, ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, type DashboardUser, type SidebarNavGroup } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import "./dashboard.css";

/**
 * The frame both dashboards live in.
 *
 * This is Watermelon's agndex `DashboardLayout`: a fixed sidebar, and a content
 * pane inset by 8px so it floats as a rounded card on the sidebar's colour
 * rather than butting against it. That inset is the whole trick of the
 * template's look, and it survives intact.
 *
 * What is deliberately absent is the site's `Navbar`. This is a full-height
 * app shell - `h-svh`, with the sidebar and the content pane scrolling
 * independently - and stacking a marketing header on top of it would give the
 * page two navigations competing for the same job. The way back out is the
 * "Back to site" row in the sidebar footer and the wordmark above it.
 */

export interface DashboardShellProps {
  areaLabel: string;
  areaRoot: string;
  groups: SidebarNavGroup[];
  user: DashboardUser;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  areaLabel,
  areaRoot,
  groups,
  user,
  actions,
  children,
}: DashboardShellProps) {
  // The wrapper is pinned to all four insets rather than given a viewport
  // height unit. SidebarProvider bakes `min-h-svh` into it, and `svh` is the
  // *small* viewport - the height with the browser's chrome fully expanded. The
  // moment that chrome retracts, or on any surface where svh undershoots the
  // real viewport, the shell is shorter than the screen and the page can be
  // scrolled down past it into a band of bare body background. `fixed inset-0`
  // makes it exactly the viewport with no unit to be wrong about, and takes it
  // out of flow so the body has nothing to scroll at all.
  return (
    <SidebarProvider
      className="dashboard-shell no-scrollbar fixed inset-0 min-h-0 overflow-hidden"
      style={{ "--sidebar-width": "16.5rem" } as CSSProperties}
    >
      <DashboardSidebar areaLabel={areaLabel} areaRoot={areaRoot} groups={groups} user={user} />

      <main className="flex-1 overflow-y-auto md:bg-sidebar md:p-2">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-card">
          <DashboardTopbar
            areaLabel={areaLabel}
            areaRoot={areaRoot}
            groups={groups}
            actions={actions}
          />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </main>
    </SidebarProvider>
  );
}

/** Standard padding and measure for a dashboard page's content. Every page uses
 *  it, so the two areas cannot drift apart on gutters. */
export function DashboardPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:gap-10 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
      </div>
      {children}
    </div>
  );
}
