import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listFeaturedCircuits } from "@/lib/featured-circuits/featured-circuits";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { FeaturedCircuitsManager } from "@/components/admin/featured-circuits-manager";

export default async function AdminFeaturedCircuitsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [homepageFeatured, communityFeatured] = await Promise.all([
    listFeaturedCircuits("HOMEPAGE_DEMO"),
    listFeaturedCircuits("COMMUNITY_WEEKLY"),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[{ label: "Featured circuits" }]} />
      <div className="mb-6 mt-3">
        <h1 className="font-display text-2xl font-bold text-ink">Featured circuits</h1>
        <p className="mt-1 text-sm text-slate">
          Two independent single-picks, each with its own candidate list. Add a candidate by project slug, then
          activate one.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Homepage live demo</h2>
        <p className="mb-4 text-xs text-slate">The circuit embedded in the &ldquo;Try it right here&rdquo; section on the homepage.</p>
        <FeaturedCircuitsManager placement="HOMEPAGE_DEMO" featured={homepageFeatured} />
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Community: Circuit of the Week</h2>
        <p className="mb-4 text-xs text-slate">The highlighted circuit at the top of the community page.</p>
        <FeaturedCircuitsManager placement="COMMUNITY_WEEKLY" featured={communityFeatured} />
      </section>
    </main>
  );
}
