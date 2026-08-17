import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InteractiveBlockView } from "@/components/content/blocks/interactive/interactive-block";
import { BreadcrumbJsonLd, FaqJsonLd, SoftwareAppJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { TOOLS, getTool } from "@/lib/tools/tools";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};

  return buildContentMetadata({
    title: tool.title,
    seoTitle: tool.seoTitle,
    seoDescription: tool.seoDescription,
    keywords: tool.keywords,
    path: `/tools/${tool.slug}`,
    type: "website",
  });
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <BreadcrumbJsonLd
          items={[
            { name: "Tools", path: "/tools" },
            { name: tool.title, path: `/tools/${tool.slug}` },
          ]}
        />
        <SoftwareAppJsonLd name={tool.title} description={tool.seoDescription} path={`/tools/${tool.slug}`} />
        {tool.faq && <FaqJsonLd entries={tool.faq} />}

        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate">
          <Link href="/tools" className="hover:text-copper-dark">
            Tools
          </Link>
          <span className="mx-1.5 text-border-strong">/</span>
          <span className="text-ink-soft">{tool.title}</span>
        </nav>

        <h1 className="font-display text-3xl font-bold leading-tight text-ink">{tool.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{tool.intro}</p>

        <div className="mt-8">
          <InteractiveBlockView
            block={{ id: `tool-${tool.slug}`, type: "interactive", widget: tool.widget, data: tool.widgetData ?? {} }}
          />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-ink">How to use it</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {tool.howTo.map((step) => (
              <li key={step} className="flex gap-2.5 text-sm text-ink-soft">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-copper" />
                {step}
              </li>
            ))}
          </ul>
        </section>

        {tool.faq && tool.faq.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-bold text-ink">Common questions</h2>
            <div className="mt-4 flex flex-col gap-3">
              {tool.faq.map((entry) => (
                <details
                  key={entry.question}
                  className="group rounded-xl border border-border bg-surface-card px-4 py-3 transition-colors hover:border-border-strong"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {entry.question}
                      <span className="shrink-0 text-slate transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-ink">Learn the theory</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {tool.related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm font-medium text-copper hover:text-copper-dark">
                  {item.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
