import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { query } from "@/lib/db/client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { SidebarNavGroup } from "@/components/dashboard/dashboard-sidebar";

/**
 * The reader's dashboard frame.
 *
 * The account page used to be one long scroll: a stats block, then a heatmap,
 * then two settings forms side by side, all under the site's marketing navbar.
 * That works while there are two settings and stops working at six. The
 * sections are separate pages now, and the shell is what makes them navigable
 * without a back button.
 */

/**
 * The counts beside three of the nav rows.
 *
 * One statement rather than three, and counts rather than the rows themselves:
 * the pages under this layout fetch what they render, and the sidebar only
 * needs to know how many there are. Failing quietly to no badges is the right
 * degradation - a nav that 500s because a count did is worse than a nav
 * without counts.
 */
async function navCounts(userId: string): Promise<{ circuits: number; solved: number; lessons: number }> {
  try {
    const [row] = await query<Record<string, unknown>>(
      `SELECT
         (SELECT count(*) FROM projects WHERE owner_id = $1)                       AS circuits,
         (SELECT count(*) FROM puzzle_progress WHERE "userId" = $1 AND solved)     AS solved,
         (SELECT count(*) FROM tutorial_progress WHERE "userId" = $1)              AS lessons`,
      [userId],
    );
    return {
      circuits: Number(row?.circuits ?? 0),
      solved: Number(row?.solved ?? 0),
      lessons: Number(row?.lessons ?? 0),
    };
  } catch {
    return { circuits: 0, solved: 0, lessons: 0 };
  }
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const counts = await navCounts(user.id);

  const groups: SidebarNavGroup[] = [
    {
      label: "Dashboard",
      items: [
        { label: "Overview", href: "/account", icon: "overview" },
        {
          label: "Progress",
          href: "/account/progress",
          icon: "progress",
          badge: counts.lessons + counts.solved || undefined,
        },
        {
          label: "Circuits",
          href: "/account/circuits",
          icon: "circuits",
          badge: counts.circuits || undefined,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Profile", href: "/account/settings", icon: "profile" },
        { label: "Security", href: "/account/settings/security", icon: "security" },
        { label: "Personalisation", href: "/account/settings/preferences", icon: "preferences" },
      ],
    },
    {
      label: "Explore",
      items: [
        { label: "Tutorials", href: "/tutorials", icon: "tutorials" },
        { label: "Puzzles", href: "/puzzles", icon: "puzzles" },
      ],
    },
    // The way across to the other dashboard, mirroring the "Your account" row
    // in the admin nav so the two areas are reachable from each other rather
    // than only from the site root. Admins only - but that is discoverability,
    // not access control: /admin has its own check in its layout *and* in every
    // page under it, so hiding the row protects nothing on its own and is not
    // relied on to.
    ...(user.role === "ADMIN"
      ? [
          {
            label: "Admin",
            items: [
              { label: "Admin dashboard", href: "/admin", icon: "overview" as const },
              { label: "Analytics", href: "/admin/analytics", icon: "analytics" as const },
            ],
          },
        ]
      : []),
  ];

  return (
    <DashboardShell
      areaLabel="Your account"
      areaRoot="/account"
      groups={groups}
      user={{
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
