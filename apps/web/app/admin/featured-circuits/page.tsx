import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listFeaturedCircuits } from "@/lib/featured-circuits/featured-circuits";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { FeaturedCircuitsManager } from "@/components/admin/featured-circuits-manager";

export default async function AdminFeaturedCircuitsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const featured = await listFeaturedCircuits();

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[{ label: "Featured circuits" }]} />
      <div className="mb-6 mt-3">
        <h1 className="font-display text-2xl font-bold text-ink">Featured circuits</h1>
        <p className="mt-1 text-sm text-slate">
          Pick which project's circuit embeds in the homepage live demo. Add candidates by slug, then activate one.
        </p>
      </div>

      <FeaturedCircuitsManager featured={featured} />
    </main>
  );
}
