import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildContentMetadata({
  title: "About Nandscape",
  seoTitle: "About Nandscape: Interactive Computer Science Learning",
  seoDescription:
    "Nandscape is a great site for learning computer science interactively, where lessons are taught smoothly.",
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
            It can be difficult to grasp Computer Science concepts through books and lectures,
            which is why Nandscape has interactive tools and visualizers, to help you understand complex topics.
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
          <h2 className="font-display text-lg font-semibold text-ink">Found an issue, or want a topic covered?</h2>
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
