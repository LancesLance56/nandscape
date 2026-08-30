import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDiagramPreset, getDiagramUsage } from "@/lib/diagrams/diagram-records";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { DiagramPresetEditor } from "@/components/admin/diagram-preset-editor";

/**
 * Edit one stored diagram, or create one at `/admin/diagrams/new`.
 *
 * `new` as a reserved slug rather than a separate route, matching how
 * /admin/blog/[slug] and /admin/tutorials/[slug] already work here - and it is
 * safe for the same reason it is safe there: a preset called "new" would
 * shadow this page, which is a naming collision the slug field is free to
 * avoid and no existing diagram has.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminDiagramPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { slug } = await params;
  const creating = slug === "new";

  const diagram = creating ? null : await getDiagramPreset(slug);
  if (!creating && !diagram) notFound();

  // Only worth asking for an existing preset: a diagram being created is on no
  // pages by definition.
  const usage = diagram
    ? await getDiagramUsage(diagram.slug).catch(() => ({ tutorials: [], posts: [] }))
    : { tutorials: [], posts: [] };

  return (
    <DashboardPage
      title={creating ? "New diagram" : diagram!.title}
      description={
        creating
          ? "Stored once and referenced by slug, so every page using it shows the same thing."
          : `Editing the shared preset. Blocks reference it as preset: "${diagram!.slug}".`
      }
    >
      <DiagramPresetEditor
        initial={
          diagram
            ? {
                slug: diagram.slug,
                kind: diagram.kind,
                title: diagram.title,
                group: diagram.group ?? "",
                position: diagram.position,
                spec: diagram.spec,
              }
            : null
        }
        usage={usage}
      />
    </DashboardPage>
  );
}
