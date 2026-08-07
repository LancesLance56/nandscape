import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAllPosts } from "@/lib/blog/posts";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminBlogIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const posts = await listAllPosts();

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[{ label: "Posts" }]} />
      <div className="mb-6 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">Posts</h1>
          <Link href="/admin/tutorials" className="font-mono text-xs text-slate hover:text-copper-dark">
            View tutorial pages →
          </Link>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          New post
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/admin/blog/${post.slug}`} className="font-semibold text-ink hover:text-copper-dark">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{post.status}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatDate(post.publishedAt)}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
