import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "About,  Nandscape",
  description: "The story behind Nandscape, and why it starts from a single NAND gate.",
};

function PortraitPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-border-strong bg-surface-2 font-display font-semibold text-copper-dark ${className}`}
      aria-hidden="true"
    >
      L
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <div className="mb-8 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper" />
          About
        </div>

        <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <PortraitPlaceholder className="h-24 w-24 shrink-0 text-3xl sm:h-28 sm:w-28 sm:text-4xl" />
          <div>
            <h1 className="mb-2 font-display text-4xl font-semibold leading-tight text-ink">
              Hi, I&apos;m Lance
            </h1>
            <p className="text-lg leading-relaxed text-ink-soft">
              A Computer Science student building Nandscape, a place to learn digital logic by
              building it.
            </p>
          </div>
        </section>

        <section className="mt-16 flex flex-col gap-5 text-base leading-relaxed text-ink-soft">
            <p>
              I started building Nandscape because most digital logic resources either jump
              straight into theory or give you diagrams to copy. I wanted something more
              interactive where you could discover how circuits work by experimenting, making
              mistakes, and gradually building more complex systems yourself.
            </p>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold text-ink">What Nandscape is</h2>
          <div className="flex flex-col gap-4 text-base leading-relaxed text-ink-soft">
            <p>
              Every puzzle gives you a goal and a limited number of gates. There isn&apos;t one
              correct solution to copy, if your circuit behaves correctly and stays within
              budget, you&apos;ve solved it.
            </p>
            <p>
              Alongside the puzzles, there&apos;s a sandbox for experimenting freely, watching
              signals propagate in real time, and saving your own circuits as reusable building
              blocks.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-base leading-relaxed text-ink-soft">
            Nandscape is an ongoing project, and I&apos;m always adding new puzzles, improving the
            editor, and making the simulator more capable. If you have ideas, feedback, or find a
            bug, I&apos;d love to hear about it.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/nandbox"
            className="inline-flex items-center justify-center rounded-xl bg-copper px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-copper-dark active:scale-[0.97]"
          >
            Open the sandbox
          </a>

          <a
            href="/puzzles"
            className="inline-flex items-center justify-center rounded-xl border border-border-strong bg-surface-card px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-all hover:bg-surface-2 active:scale-[0.97]"
          >
            Browse puzzles
          </a>
        </div>
      </main>
    </>
  );
}