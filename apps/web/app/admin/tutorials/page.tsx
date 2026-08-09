import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listTutorialPages } from "@/lib/tutorials/tutorials";
import { listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminTutorialTree } from "@/components/admin/admin-tutorial-tree";

export default async function AdminTutorialsIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [pages, sections] = await Promise.all([listTutorialPages(), listTutorialSections()]);

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[{ label: "Tutorial pages" }]} />
      <div className="mb-6 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">Tutorial pages</h1>
          <Link href="/admin/blog" className="font-mono text-xs text-slate hover:text-copper-dark">
            View posts →
          </Link>
        </div>
        <Link
          href="/admin/tutorials/new"
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          New tutorial page
        </Link>
      </div>

      <AdminTutorialTree pages={pages} sections={sections} />
    </main>
  );
}
