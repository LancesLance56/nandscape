import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildContentMetadata({
  title: "About Nandscape",
  seoTitle: "About Nandscape: Interactive Computer Science Learning",
  seoDescription:
    "Why Nandscape exists: computer science taught through tools you can poke at, not walls of text. Free, open to everyone, no signup required.",
  path: "/about",
  type: "website",
});

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 sm:px-10">
        <h1 className="font-display text-3xl font-bold leading-tight text-ink">About Nandscape</h1>

        <div className="mt-8 flex flex-col gap-5 text-sm leading-relaxed text-ink-soft">
          <p>
            Nandscape started from a simple frustration: digital logic is not a hard subject, but it is taught
            almost entirely through static diagrams. A truth table on a page cannot show you what happens when you
            flip an input. A circuit diagram cannot show you a signal propagating.
          </p>
          <p>
            So the whole site is built around things you can actually interact with. Every tutorial has a circuit
            you can rewire, an algorithm you can step through one frame at a time, or a widget you can break and
            then fix. The{" "}
            <Link href="/logic-editor" className="font-medium text-copper hover:text-copper-dark">
              logic editor
            </Link>{" "}
            simulates real gates. The{" "}
            <Link href="/puzzles" className="font-medium text-copper hover:text-copper-dark">
              puzzles
            </Link>{" "}
            grade what you build against actual test cases, not a multiple-choice answer.
          </p>
          <p>
            It is free, it needs no signup to use, and it always will. An account only exists so you can save
            projects and track which puzzles you have solved.
          </p>
          <p>
            The library covers{" "}
            <Link href="/tutorials/digital-logic" className="font-medium text-copper hover:text-copper-dark">
              digital logic
            </Link>{" "}
            and{" "}
            <Link href="/tutorials/dsa" className="font-medium text-copper hover:text-copper-dark">
              data structures and algorithms
            </Link>
            , and is still growing.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Found a bug, or want a topic covered?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Suggestions genuinely shape what gets built next.{" "}
            <Link href="/contact" className="font-medium text-copper hover:text-copper-dark">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
