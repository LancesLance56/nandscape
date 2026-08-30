import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Workflow } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listDiagramPresets, listDiagramUsageCounts } from "@/lib/diagrams/diagram-records";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";

/**
 * The stored teaching diagrams.
 *
 * These were moved out of the bundle so that fixing a diagram would not need a
 * deploy - but until now the only ways to actually change one were re-running
 * the seed script or hand-editing raw JSON in Prisma Studio, which is most of
 * the way back to needing a deploy. This is the missing half.
 *
 * Grouped the same way the block editor's picker groups them, so what an
 * author sees when choosing a diagram and what an admin sees when editing one
 * are the same shape.
 */

export default async function AdminDiagramsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [diagrams, usage] = await Promise.all([
    listDiagramPresets(),
    listDiagramUsageCounts().catch(() => new Map<string, number>()),
  ]);

  // `listDiagramPresets` already orders by kind, then group, then position, so
  // grouping is a single pass rather than a sort.
  const groups = new Map<string, typeof diagrams>();
  for (const diagram of diagrams) {
    const label = `${diagram.kind === "graph" ? "Graph" : "Flowchart"} · ${diagram.group ?? "Ungrouped"}`;
    groups.set(label, [...(groups.get(label) ?? []), diagram]);
  }

  const unused = diagrams.filter((diagram) => (usage.get(diagram.slug) ?? 0) === 0).length;

  return (
    <DashboardPage
      title="Diagrams"
      description={`${diagrams.length} stored ${
        diagrams.length === 1 ? "diagram" : "diagrams"
      }, edited here rather than re-seeded. Editing one changes every page that shows it.`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate">
          {unused === 0
            ? "Every diagram is in use on at least one page."
            : `${unused} of ${diagrams.length} are not on any page yet.`}
        </p>
        <Link
          href="/admin/diagrams/new"
          className="flex items-center gap-1.5 rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark"
        >
          <Plus className="size-4" />
          New diagram
        </Link>
      </div>

      {diagrams.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface-card p-6 text-sm text-slate">
          No diagrams stored yet. Seed them with{" "}
          <code className="font-mono text-xs">node seed/seed.mjs</code>, or create one above.
        </p>
      ) : (
        Array.from(groups.entries()).map(([label, entries]) => (
          <section key={label} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">{label}</h2>
            <ul className="flex flex-col gap-2">
              {entries.map((diagram) => {
                const uses = usage.get(diagram.slug) ?? 0;
                return (
                  <li key={diagram.slug}>
                    <Link
                      href={`/admin/diagrams/${encodeURIComponent(diagram.slug)}`}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-surface-card p-3 transition-colors hover:border-copper hover:bg-(--card-hover)"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-copper-bg text-copper-dark">
                        <Workflow className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink group-hover:text-copper-dark">
                          {diagram.title}
                        </span>
                        <span className="block truncate font-mono text-xxs text-slate">
                          {diagram.slug}
                        </span>
                      </span>
                      <span className="shrink-0 text-xxs tabular-nums text-slate">
                        {uses === 0 ? "unused" : `${uses} ${uses === 1 ? "page" : "pages"}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </DashboardPage>
  );
}
