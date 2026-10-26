import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Code2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TOOLS, toolHref } from "@/lib/tools/tools";
import { DEFAULT_HEIGHT } from "@/lib/embeds/embeddable";
import { ToolsCatalog, type CatalogTool } from "@/components/tools/tools-catalog";
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

/** One of the two ways out of the list: the full editor, or the embed docs. */
function QuickLink({ href, icon, iconClass, title, line }: { href: string; icon: ReactNode; iconClass: string; title: string; line: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-[14px] border border-border bg-surface-card p-3 text-ink transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:gap-3.5 sm:rounded-2xl sm:px-4 sm:py-3.5"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] sm:h-10 sm:w-10 sm:rounded-[11px] ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm sm:text-[15px]">{title}</b>
        <span className="hidden text-[13px] text-ink-soft sm:block">{line}</span>
      </span>
      <ArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-slate transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

export default function ToolsIndexPage() {
  // Only what the list draws crosses to the client, not every tool's SEO copy.
  const tools: CatalogTool[] = TOOLS.map((tool) => ({
    slug: tool.slug,
    title: tool.title,
    intro: tool.intro,
    group: tool.group,
    href: toolHref(tool),
    embedHeight: tool.embedHeight ?? DEFAULT_HEIGHT,
  }));

  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-330 flex-col gap-6 px-6 pb-24 pt-28 sm:px-10 sm:pt-32 md:gap-10">
        <section className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div className="max-w-[40rem] flex-[1_1_460px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-copper-dark sm:mb-2.5 sm:text-[13px]">Tools</p>
            <h1 className="font-display text-[34px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[52px] lg:leading-[1.04]">
              Embeddable interactive tools for computer science
            </h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft sm:mt-4 sm:text-lg">
              Runs in your browser, and is embeddable into blogs
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex-[0_1_360px] sm:grid-cols-1 sm:gap-2.5">
            <QuickLink
              href="/logic-editor"
              icon={<span className="font-label text-[13px] font-bold sm:text-sm">&amp;</span>}
              iconClass="bg-[#ff751a] text-[#1d1f22]"
              title="Logic gate editor"
              line="The full sandbox, for building circuits."
            />
            <QuickLink
              href="#embeds"
              icon={<Code2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
              iconClass="bg-[#1d1f22] text-white dark:bg-[#efeeed] dark:text-[#1d1f22]"
              title="Embed a tool"
              line="One line of HTML, on any page."
            />
          </div>
        </section>

        <ToolsCatalog tools={tools} />

        {/* The embedding reference used to be its own route. It sits under the
            list of tools now, because everything it documents is on that list
            and a reader had to already know /embeds existed to find it. */}
        <div className="mt-14 md:mt-10">
          <FaqJsonLd entries={EMBEDS_FAQ} />
          <EmbedsSection />
        </div>
      </main>
      <Footer />
    </>
  );
}
