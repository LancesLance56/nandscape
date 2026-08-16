import Link from "next/link";
import { listTutorialNav } from "@/lib/tutorials/tutorials";
import { ScrollReveal } from "@/components/scroll-reveal";
import { hexToRgba } from "@/lib/editor/block-colors";
import { CardLink } from "@/components/ui/card";
import { tutorialPath } from "@/types/tutorial";

// A warm, on-brand palette for tutorial path badges - deliberately separate
// from DEFAULT_BLOCK_COLORS (which includes a blue for tabular/data
// contexts), so the tutorials section stays in the orange/copper family
// rather than picking up cool tones.
const PATH_COLORS: readonly string[] = [
  "#C15A2A", // copper
  "#E0A339", // amber
  "#B25A3B", // rust
  "#D9694F", // signal coral
  "#8A8F5C", // olive
];

function pathColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PATH_COLORS[hash % PATH_COLORS.length];
}

export async function TutorialsShowcase() {
  let tree: Awaited<ReturnType<typeof listTutorialNav>> = { standalone: [], sections: [] };
  try {
    tree = await listTutorialNav();
  } catch {
    tree = { standalone: [], sections: [] };
  }

  const hasContent = tree.sections.length > 0 || tree.standalone.length > 0;
  if (!hasContent) return null;

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            {tree.sections.length} guided path{tree.sections.length === 1 ? "" : "s"}
          </div>
          <h2 className="text-3xl font-semibold text-ink">Learn Step by Step</h2>
        </div>
        <Link
          href="/tutorials"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all tutorials →
        </Link>
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.sections.map((section, i) => {
          const color = pathColor(section.slug);
          const firstPage = section.pages[0];

          return (
            <ScrollReveal key={section.id} delay={i * 60}>
              <CardLink
                href={firstPage ? tutorialPath(firstPage.trackSlug, firstPage.slug) : "/tutorials"}
                className="flex items-center gap-3.5 p-5"
              >
                <div
                  style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                >
                  {section.pages.length}
                </div>

                <div className="min-w-0 flex-1">
                  <span style={{ color }} className="text-xs font-semibold">
                    {section.slug}
                  </span>
                  <h3 className="mt-0.5 truncate text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                    {section.title}
                  </h3>
                </div>
              </CardLink>
            </ScrollReveal>
          );
        })}

        {tree.standalone.map((page, i) => (
          <ScrollReveal key={page.slug} delay={(tree.sections.length + i) * 60}>
            <CardLink href={tutorialPath(page.trackSlug, page.slug)} className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-bold text-slate">
                1
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate">Standalone lesson</span>
                <h3 className="mt-0.5 truncate text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                  {page.title}
                </h3>
              </div>
            </CardLink>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
