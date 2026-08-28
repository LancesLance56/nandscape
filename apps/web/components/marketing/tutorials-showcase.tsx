import Link from "next/link";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import { ScrollReveal } from "@/components/scroll-reveal";
import { FolderStack, type Folder, type FolderTab } from "./folder-stack";
import { tutorialPath } from "@/types/tutorial";
import type { TutorialTrackTree } from "@/types/tutorial";

/**
 * The tutorials block: a drawer of four topic folders.
 *
 * The nine sections are regrouped by subject rather than by the
 * digital-logic / DSA split - "Logic & Gates", "Graphs" and so on - so the
 * homepage leads with a curriculum you can take in at a glance and open one
 * folder of. Lesson counts and first-lesson titles stay live from the tutorial
 * tree; only the grouping and the blurbs are curated here.
 */
/**
 * How many real lesson titles each section card previews. Lives here rather
 * than in folder-stack: that module is "use client", and a plain value
 * imported from a client module into a server component arrives as a client
 * reference, not the number.
 */
const LESSON_PREVIEW = 3;

const FOLDERS: { id: string; label: string; blurb: string; tabs: { slug: string; name: string }[] }[] = [
  {
    id: "logic",
    label: "Logic & Gates",
    blurb:
      "Detailed explanation and introduction to how logic gates work",
    tabs: [
      { slug: "gate-implementations", name: "Gate Implementations" },
      { slug: "karnaugh-maps", name: "Karnaugh Maps" },
      { slug: "sequential-logic", name: "Sequential Logic" },
    ],
  },
  {
    id: "graphs",
    label: "Graphs",
    blurb:
      "Interactive guide on graph theory for CS students",
    tabs: [
      { slug: "graph-theory-basics", name: "Graph Basics" },
      { slug: "graph-theory-concepts", name: "Key Concepts" },
      { slug: "graph-theory-advanced", name: "Advanced" },
    ],
  },
  {
    id: "search",
    label: "Recursion & Search for coding interviews and programming",
    blurb:
      "Try, fail, back up, try again, and the trick of never solving the same subproblem twice.",
    tabs: [
      { slug: "backtracking", name: "Backtracking" },
      { slug: "dynamic-programming", name: "Dynamic Programming" },
    ],
  },
  {
    id: "sorting",
    label: "The most studied problem in computing",
    blurb:
      "Several ways to put a list in order, each animated one frame at a time, and why the fast ones are fast.",
    tabs: [{ slug: "sorting", name: "Sorting" }],
  },
];

export async function TutorialsShowcase() {
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  // Flatten every track's sections into one lookup, so a curated folder can
  // pull a section by slug without caring which track it lived under.
  const sections = new Map<string, Omit<FolderTab, "slug" | "name">>();
  for (const track of tracks) {
    for (const s of track.sections) {
      if (s.pages.length === 0) continue;
      const first = s.pages[0];
      sections.set(s.slug, {
        title: s.title,
        count: s.pages.length,
        href: tutorialPath(first.trackSlug, first.slug),
        // The opening run of real lesson titles. Enough to show what a section
        // actually teaches; the card says how many more there are.
        lessons: s.pages.slice(0, LESSON_PREVIEW).map((page) => ({
          title: page.title,
          href: tutorialPath(page.trackSlug, page.slug),
        })),
      });
    }
  }

  const folders: Folder[] = FOLDERS.map((f) => {
    const tabs = f.tabs
      .map((t): FolderTab | null => {
        const sec = sections.get(t.slug);
        if (!sec) return null;
        return { slug: t.slug, name: t.name, ...sec };
      })
      .filter((t): t is FolderTab => t !== null);

    return { id: f.id, label: f.label, blurb: f.blurb, count: tabs.reduce((n, t) => n + t.count, 0), tabs };
  }).filter((f) => f.tabs.length > 0);

  if (folders.length === 0) return null;

  const lessons = folders.reduce((n, f) => n + f.count, 0);

  return (
    <section className="py-20">
      <ScrollReveal>
        <p className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-wide text-copper-dark">
          <span className="h-1.5 w-1.5 rounded-full bg-copper" />
          {lessons} lessons · {folders.length} folders
        </p>

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h2 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] text-balance text-ink sm:text-5xl">
            Learn step by step
          </h2>
          <Link
            href="/tutorials"
            className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
          >
            Browse all tutorials &rarr;
          </Link>
        </div>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
          A short stack of lessons for everything computer science, fully interactive and fun.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={80} className="mt-10">
        <FolderStack folders={folders} />
      </ScrollReveal>
    </section>
  );
}
