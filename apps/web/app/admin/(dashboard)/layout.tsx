import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { SidebarNavGroup } from "@/components/dashboard/dashboard-sidebar";

/**
 * The admin dashboard's frame.
 *
 * A route group rather than a plain `app/admin/layout.tsx` because three admin
 * routes are not dashboard pages at all: the post and tutorial editors and
 * Prisma Studio are full-screen applications that manage their own chrome and
 * their own scrolling. Nesting one inside a shell that is itself `h-svh` gives
 * you an editor in a box, scrolling inside a pane that is scrolling inside a
 * page. `(dashboard)` groups the routes that *are* dashboard pages and leaves
 * those three at `/admin/*` untouched - the group changes the layout tree
 * without changing a single URL.
 *
 * The auth check is here rather than only on each page: a layout runs before
 * the page it wraps, so an admin-only shell cannot render for a reader who
 * should not see it. Each page keeps its own check regardless - layouts are not
 * a security boundary in the App Router, and the page is what reads the data.
 */

const NAV: SidebarNavGroup[] = [
  {
    label: "Insight",
    items: [
      { label: "Overview", href: "/admin", icon: "overview" },
      { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Posts", href: "/admin/blog", icon: "posts" },
      { label: "Tutorial pages", href: "/admin/tutorials", icon: "tutorials" },
      { label: "Diagrams", href: "/admin/diagrams", icon: "diagrams" },
      { label: "Featured circuits", href: "/admin/featured-circuits", icon: "featured" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users", href: "/admin/users", icon: "users" },
      { label: "Database", href: "/admin/database", icon: "database" },
      { label: "Your account", href: "/account", icon: "profile" },
    ],
  },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <DashboardShell
      areaLabel="Admin"
      areaRoot="/admin"
      groups={NAV}
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
