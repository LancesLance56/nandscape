import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAllPosts } from "@/lib/blog/posts";
import { listTutorialPages } from "@/lib/tutorials/tutorials";
import { listUsers } from "@repo/auth";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

interface AdminSection {
  href: string;
  label: string;
  description: string;
  count?: number;
  countLabel?: string;
}

export default async function AdminIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [posts, tutorialPages, users] = await Promise.all([listAllPosts(), listTutorialPages(), listUsers()]);

  const sections: AdminSection[] = [
    {
      href: "/admin/blog",
      label: "Posts",
      description: "Blog posts - write, edit, and publish.",
      count: posts.length,
      countLabel: posts.length === 1 ? "post" : "posts",
    },
    {
      href: "/admin/tutorials",
      label: "Tutorial pages",
      description: "Tutorial content, grouped into sections.",
      count: tutorialPages.length,
      countLabel: tutorialPages.length === 1 ? "page" : "pages",
    },
    {
      href: "/admin/users",
      label: "Users",
      description: "Manage accounts and admin access.",
      count: users.length,
      countLabel: users.length === 1 ? "user" : "users",
    },
    {
      href: "/admin/database",
      label: "Database",
      description: "Browse and edit raw tables with Prisma Studio.",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[]} />
      <div className="mb-8 mt-3">
        <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
        <p className="mt-1 text-sm text-slate">Signed in as {user.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface-card p-6 transition-colors hover:border-copper"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-ink group-hover:text-copper-dark">
                {section.label}
              </span>
              {section.count !== undefined && (
                <span className="font-mono text-xs text-slate">
                  {section.count} {section.countLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft">{section.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
