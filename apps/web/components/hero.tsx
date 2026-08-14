import Link from "next/link";
import { HeroShowcase } from "@/components/marketing/hero-showcase";

const FACTS = [
  { value: "No Signup Required", label: "Learn anything for free" },
  { value: "Instant Feedback", label: "Learn from your mistakes" },
];

export function Hero() {
  return (
    <section className="relative grid gap-14 overflow-hidden pb-20 pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
      <div className="relative z-10">
        <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-ink lg:text-6xl lg:leading-[1.08]">
          Computer Science Taught {" "}
          <span className="relative inline-block whitespace-nowrap">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0.5 top-2 -z-10 -rotate-1 rounded-sm bg-yellow-300/70 dark:bg-yellow-400/35"
            />
            <span className="relative">Interactively</span>
          </span>
          .
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-8 text-ink-soft">
          Nandscape is a computer science learning site built around hands-on tools. Learn interactively through tutorials while having fun solving puzzles and problems. Built for competitive programmers and CS students alike, completely free.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          {FACTS.map((fact, i) => (
            <div key={fact.value} className="flex items-center gap-8">
              {i > 0 && <span className="hidden h-9 w-px bg-border sm:block" />}
              <div>
                <div className="text-lg font-bold text-ink">{fact.value}</div>
                <div className="text-sm text-ink-soft">{fact.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex justify-center lg:justify-end">
        <HeroShowcase />
      </div>
    </section>
  );
}
