import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CardLink } from "@/components/ui/card";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TOOLS } from "@/lib/tools/tools";

export const revalidate = 3600;

export const metadata: Metadata = buildContentMetadata({
  title: "Interactive Computer Science Tools",
  seoTitle: "Free Computer Science Tools: K-Maps, Binary, Graphs",
  seoDescription:
    "Free interactive tools for computer science: a Karnaugh map solver, binary converter, truth table generator and graph algorithm visualizer.",
  path: "/tools",
  type: "website",
  keywords: ["computer science tools", "karnaugh map solver", "binary converter", "graph algorithm visualizer"],
});

export default function ToolsIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold leading-tight text-ink">Tools</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Small, focused tools that do one job. All free, all in the browser, none of them ask you to sign up.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <CardLink key={tool.slug} href={`/tools/${tool.slug}`} className="flex h-full flex-col p-5">
              <h2 className="font-display text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
                {tool.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{tool.intro}</p>
              <span className="mt-auto pt-4 text-xs font-semibold text-copper-dark">Open tool →</span>
            </CardLink>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-soft">
          Want the full sandbox instead?{" "}
          <Link href="/logic-editor" className="font-medium text-copper hover:text-copper-dark">
            Open the logic gate editor
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}
