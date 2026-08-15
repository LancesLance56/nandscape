import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildContentMetadata({
  title: "Contact",
  seoTitle: "Contact Nandscape: Feedback, Bugs and Topic Requests",
  seoDescription:
    "Get in touch about a bug, a tutorial topic you want covered, or using Nandscape in a classroom.",
  path: "/contact",
  type: "website",
});

const REASONS = [
  {
    heading: "Something is broken",
    body: "A circuit that will not simulate, a puzzle that rejects a correct answer, a page that renders wrong. Include the URL and what you expected to happen.",
  },
  {
    heading: "You want a topic covered",
    body: "Tell me what you are stuck on. Requests are the main thing that decides what gets written next.",
  },
  {
    heading: "You teach this",
    body: "If you want to use Nandscape with a class, or embed a circuit in your own course notes, that is explicitly encouraged. Say hello and I will help you set it up.",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 sm:px-10">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink">Contact</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Nandscape is built and maintained by one person, so every message is read by the person who can
          actually act on it.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface-card p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate">Email</h2>
          <a
            href="mailto:hello@nandscape.dev"
            className="mt-1 block font-display text-lg font-semibold text-copper hover:text-copper-dark"
          >
            hello@nandscape.dev
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          {REASONS.map((reason) => (
            <div key={reason.heading}>
              <h2 className="font-display text-base font-bold text-ink">{reason.heading}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{reason.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-soft">
          Not sure where to start?{" "}
          <Link href="/about" className="font-medium text-copper hover:text-copper-dark">
            Read about the project
          </Link>{" "}
          first.
        </p>
      </main>
      <Footer />
    </>
  );
}
