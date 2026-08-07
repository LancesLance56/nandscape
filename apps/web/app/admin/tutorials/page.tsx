import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listTutorialPages } from "@/lib/tutorials/tutorials";
import { listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminTutorialsIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [pages, sections] = await Promise.all([listTutorialPages(), listTutorialSections()]);
  const sectionTitleById = new Map(sections.map((section) => [section.id, section.title]));

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

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/tutorials/${page.slug}`}
                    className="font-semibold text-ink hover:text-copper-dark"
                  >
                    {page.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate">
                  {page.sectionId ? (sectionTitleById.get(page.sectionId) ?? "-") : "-"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{page.status}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatDate(page.publishedAt)}</td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate">
                  No tutorial pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
