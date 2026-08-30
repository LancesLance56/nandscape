import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EmbedGallery } from "@/components/embeds/embed-gallery";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { embedCatalog } from "@/lib/embeds/embeddable";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export const metadata: Metadata = buildContentMetadata({
  title: "Embed Interactive Computer Science Tools",
  seoTitle: "Embeddable CS Widgets: Sorting, K-Maps, Flowcharts, Circuits",
  seoDescription:
    "Embed interactive computer science tools in any site or LMS with one iframe. Sorting visualizers, Karnaugh map solvers, algorithm flowcharts and logic circuits. Free, no account, no script.",
  path: "/embeds",
  type: "website",
  keywords: [
    "embeddable sorting visualizer",
    "embed algorithm visualizer",
    "interactive computer science widgets",
    "embed logic circuit simulator",
    "embed flowchart",
    "teaching tools iframe",
  ],
});

const FAQ = [
  {
    question: "How do I embed a Nandscape tool on my site?",
    answer:
      "Copy the iframe snippet from any tool page, or from the picker above, and paste it into your own page wherever HTML is allowed. You don't need to load a script, make an account or get an API key. Because it is an ordinary iframe, it works in WordPress, Ghost, Notion, Canvas, Moodle, Confluence, Google Sites and any static site generator.",
  },
  {
    question: "Do embeds stay interactive?",
    answer:
      "Yes. An embed runs the actual tool rather than showing a picture of one. Readers can drive a sorting visualizer, click cells in a Karnaugh map, step a graph traversal or toggle the inputs of a logic circuit, the same as they can here.",
  },
  {
    question: "Can I match the embed to my site's colours?",
    answer:
      "Add ?theme=light or ?theme=dark to the embed URL to pin it. Leave it off and the embed follows the reader's own system setting, which is usually what you want on a site that already respects dark mode.",
  },
  {
    question: "Can I remove the 'Built with Nandscape' link?",
    answer:
      "Yes. Add ?credit=0 to the embed URL, or untick the credit box before copying the snippet. It is on by default because an embed sitting on someone else's page is a fair place to ask for a link back, but you can always turn it off.",
  },
  {
    question: "Does the embed resize itself?",
    answer:
      "The iframe uses whatever height you give it in the snippet. Embeds also post their real content height to the parent page as a message of type 'nandscape:embed:height', so a host page that wants to size the frame exactly can listen for that. Hosts that ignore it keep the fixed height they asked for.",
  },
  {
    question: "Is there an oEmbed endpoint?",
    answer:
      "Yes, at /api/oembed. Tool and project pages advertise it with a discovery link, so platforms that support oEmbed can turn a pasted Nandscape link straight into the running tool without anyone touching HTML.",
  },
];

/** Live rows in the URL reference, so the documented shapes are the ones the
 *  router actually parses rather than prose that drifts away from the code. */
const URL_SHAPES: { pattern: string; meaning: string; example: string }[] = [
  { pattern: "/embed/tool/<slug>", meaning: "Any tool on /tools", example: "/embed/tool/sorting-algorithm-visualizer" },
  { pattern: "/embed/flowchart/<name>", meaning: "A named algorithm flowchart", example: "/embed/flowchart/merge" },
  { pattern: "/embed/circuit/<slug>", meaning: "A saved logic circuit", example: "/embed/circuit/xor-from-nands" },
  { pattern: "/embed/graph/<slug>", meaning: "A stored graph example", example: "/embed/graph/weighted-demo" },
  { pattern: "/embed/widget/<key>", meaning: "Any widget, configured inline", example: "/embed/widget/kmap-explorer" },
];

const OPTIONS: { flag: string; does: string }[] = [
  { flag: "?theme=light | dark", does: "Pin the colour scheme. Omit it to follow the reader's system setting." },
  { flag: "?credit=0", does: "Remove the 'Built with Nandscape' link in the corner." },
  { flag: "?data=<base64>", does: "Configure a /embed/widget/… embed with your own JSON." },
];

export default function EmbedsPage() {
  const catalog = embedCatalog();
  const origin = siteUrl();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <BreadcrumbJsonLd items={[{ name: "Embeds", path: "/embeds" }]} />
        <FaqJsonLd entries={FAQ} />

        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Embeds
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Embed our interactives on your site
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {catalog.length} customizable embeds for teaching computer science. Works on all platforms (scroll down for Wordpress, Notion, etc.)
          </p>
        </div>

        <div className="mt-10">
          <EmbedGallery catalog={catalog} />
        </div>

        {/* ------------------------------------------------------------- */}

        <section className="mt-16">
          <h2 className="font-display text-lg font-bold text-ink">The URL shapes</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Every embed is a plain URL you can write by hand. The picker above just saves you the typing.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Pattern</th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">What it is</th>
                  <th className="py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">Example</th>
                </tr>
              </thead>
              <tbody>
                {URL_SHAPES.map((row) => (
                  <tr key={row.pattern} className="border-b border-border/60">
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink">{row.pattern}</td>
                    <td className="py-2.5 pr-4 text-xs text-ink-soft">{row.meaning}</td>
                    <td className="py-2.5">
                      <Link
                        href={row.example}
                        className="font-mono text-xs text-copper hover:text-copper-dark"
                        target="_blank"
                      >
                        {row.example}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 font-display text-base font-bold text-ink">Options</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {OPTIONS.map((option) => (
              <li key={option.flag} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-soft">
                <code className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">
                  {option.flag}
                </code>
                {option.does}
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------- */}

        <section className="mt-16">
          <h2 className="font-display text-lg font-bold text-ink">oEmbed</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Platforms that speak{" "}
            <a
              href="https://oembed.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-copper hover:text-copper-dark"
            >
              oEmbed
            </a>
            , including WordPress, Ghost, Notion and Discourse, can turn a pasted Nandscape link into the running tool
            with no HTML at all. Tool and project pages carry the discovery link, and the endpoint is public:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface-card p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
            {`GET ${origin}/api/oembed?url=${origin}/tools/sorting-algorithm-visualizer&format=json`}
          </pre>
        </section>

        {/* ------------------------------------------------------------- */}

        <section className="mt-16">
          <h2 className="font-display text-lg font-bold text-ink">Common questions</h2>
          <div className="mt-4 flex max-w-3xl flex-col gap-3">
            {FAQ.map((entry) => (
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
      </main>
      <Footer />
    </>
  );
}
