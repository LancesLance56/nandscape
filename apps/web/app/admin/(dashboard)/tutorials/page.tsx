import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listTutorialPages } from "@/lib/tutorials/tutorials";
import { listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import { listTutorialTracks } from "@/lib/tutorials/tutorial-tracks";
import { AdminTutorialTree } from "@/components/admin/admin-tutorial-tree";

export default async function AdminTutorialsIndexPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [pages, sections, tracks] = await Promise.all([
    listTutorialPages(),
    listTutorialSections(),
    listTutorialTracks(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">Tutorial pages</h1>
          <Link href="/admin/blog" className=" text-xs text-slate hover:text-copper-dark">
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

      <AdminTutorialTree pages={pages} sections={sections} tracks={tracks} />
    </div>
  );
}
