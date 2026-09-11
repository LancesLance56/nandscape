import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AccentTile, SplitIndex } from "@/components/ui/rail";
import { accentsFor } from "@/lib/ui/accent-palette";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TOOLS, toolHref } from "@/lib/tools/tools";
import { EmbedsSection, EMBEDS_FAQ } from "@/components/embeds/embeds-section";
import { FaqJsonLd } from "@/components/seo/json-ld";

export const revalidate = 3600;

export const metadata: Metadata = buildContentMetadata({
  title: "Interactive Computer Science Tools",
  seoTitle: "Free Computer Science Tools: K-Maps, Binary, Graphs, Sorting",
  seoDescription:
    "Free interactive tools for computer science: a Karnaugh map solver, binary converter, truth table generator, sorting and graph algorithm visualizers. Every one embeds in your own site with a single iframe.",
  path: "/tools",
  type: "website",
  keywords: [
    "computer science tools",
    "karnaugh map solver",
    "binary converter",
    "graph algorithm visualizer",
    "embeddable sorting visualizer",
    "interactive computer science widgets",
  ],
});

export default function ToolsIndexPage() {
  const accents = accentsFor(TOOLS.map((t) => t.slug));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <SplitIndex
          title={<h1 className="font-display text-3xl font-bold leading-tight text-ink">Tools</h1>}
          intro={
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Small, focused tools that do one job. All free, all in the browser, none of them ask you to sign up.
            </p>
          }
          aside={
            <div className="mt-5 flex flex-col gap-2 text-sm text-ink-soft">
              <p>
                Want the full sandbox instead?{" "}
                <Link href="/logic-editor" className="font-medium text-copper hover:text-copper-dark">
                  Open the logic gate editor
                </Link>
                .
              </p>
              <p>
                Every tool here embeds in your own site.{" "}
                <Link href="#embeds" className="font-medium text-copper hover:text-copper-dark">
                  Jump to embedding
                </Link>
                .
              </p>
            </div>
          }
        >
          {TOOLS.map((tool, i) => (
            <AccentTile
              key={tool.slug}
              href={toolHref(tool)}
              index={String(i + 1).padStart(2, "0")}
              title={tool.title}
              accent={accents[i]}
            >
              <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-soft">{tool.intro}</span>
            </AccentTile>
          ))}
        </SplitIndex>

        {/* The embedding reference used to be its own route. It sits under the
            list of tools now, because everything it documents is on that list
            and a reader had to already know /embeds existed to find it. */}
        <div className="mt-20">
          <FaqJsonLd entries={EMBEDS_FAQ} />
          <EmbedsSection />
        </div>
      </main>
      <Footer />
    </>
  );
}
