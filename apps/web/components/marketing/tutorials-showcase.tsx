import Link from "next/link";
import { listTutorialNav } from "@/lib/tutorials/tutorials";
import { ScrollReveal } from "@/components/scroll-reveal";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";

function pathColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return DEFAULT_BLOCK_COLORS[hash % DEFAULT_BLOCK_COLORS.length];
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
          <div className="mb-2 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            {tree.sections.length} guided path{tree.sections.length === 1 ? "" : "s"}
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Learn Step by Step</h2>
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
          const previewPages = section.pages.slice(0, 4);
          const remaining = section.pages.length - previewPages.length;

          return (
            <ScrollReveal key={section.id} delay={i * 60}>
              <Link
                href={firstPage ? `/tutorials/${firstPage.slug}` : "/tutorials"}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-surface-card/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                    className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                  >
                    {section.slug}
                  </span>
                  <span className="font-mono text-[11px] text-slate">
                    {section.pages.length} lesson{section.pages.length === 1 ? "" : "s"}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                  {section.title}
                </h3>

                <ul className="mt-1 flex flex-col gap-1.5">
                  {previewPages.map((page, idx) => (
                    <li key={page.slug} className="flex items-center gap-2 text-xs text-ink-soft">
                      <span className="w-4 shrink-0 text-right font-mono text-[10px] text-border-strong">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{page.title}</span>
                    </li>
                  ))}
                  {remaining > 0 && (
                    <li className="pl-6 font-mono text-[11px] text-slate">+{remaining} more</li>
                  )}
                </ul>

                <span className="mt-auto flex items-center gap-1 pt-1 font-mono text-xs font-semibold text-copper-dark opacity-80 transition-opacity group-hover:opacity-100">
                  Start learning →
                </span>
              </Link>
            </ScrollReveal>
          );
        })}

        {tree.standalone.map((page, i) => (
          <ScrollReveal key={page.slug} delay={(tree.sections.length + i) * 60}>
            <Link
              href={`/tutorials/${page.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-surface-card/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98]"
            >
              <span className="w-fit rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate">
                Lesson
              </span>
              <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                {page.title}
              </h3>
              <span className="mt-auto flex items-center gap-1 pt-1 font-mono text-xs font-semibold text-copper-dark opacity-0 transition-opacity group-hover:opacity-100">
                Read lesson →
              </span>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}