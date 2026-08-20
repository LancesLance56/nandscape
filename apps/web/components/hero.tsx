import Link from "next/link";
import { HeroBackdrop } from "@/components/marketing/hero-backdrop";
import { HeroKMapCard, HeroStage, HeroTreeCard } from "@/components/marketing/hero-stage";

/**
 * The landing hero.
 *
 * Centred copy over routing guides, flanked by two small teaching canvases,
 * with two full-size ones running underneath. The margin cards are the
 * reference layout's device: fragments of the product parked in the whitespace
 * so the page shows what it is rather than describing it.
 *
 * The margins only carry cards once there is room for them, so the composition
 * degrades to a single column of copy and the two canvases rather than to a
 * crush of shrunken diagrams.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-36">
      <HeroBackdrop />

      <div className="relative">
        {/* Scaled down a little. `main` caps at max-w-330, so past about
            1440px the margin stops growing; without this the cards graze the
            copy column at the breakpoint edge. */}
        <div className="pointer-events-none absolute left-0 top-8 hidden xl:block">
          <div className="pointer-events-auto origin-left -rotate-1 scale-[0.82]">
            <HeroKMapCard />
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-16 hidden xl:block">
          <div className="pointer-events-auto origin-right rotate-1 scale-90">
            <HeroTreeCard />
          </div>
        </div>

        {/* Narrower from xl up, which is exactly where the margin cards appear.
            At max-w-3xl the copy reached 1097px while the right-hand card
            started at 1059, so the two overlapped on a 1425px screen. */}
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center xl:max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border-strong/70 bg-surface-card/70 px-3.5 py-1.5 text-xs font-medium text-ink-soft backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
            Free, no signup, runs in your browser
          </p>

          <h1 className="mt-7 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl lg:leading-[1.08] xl:text-[3.4rem]">
            The interactive approach to <span className="text-accent-display">computer science</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Every lesson is something you can drive. Wire the gate, step the algorithm, watch it break, and find out
            why it works instead of being told.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tutorials"
              className="rounded-full bg-copper px-6 py-3 text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark"
            >
              Start learning
            </Link>
            <Link
              href="/puzzles"
              className="rounded-full border border-border-strong bg-surface-card/70 px-6 py-3 text-sm font-semibold text-ink backdrop-blur-sm transition-colors hover:border-ink-soft"
            >
              Try a problem
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-16">
        <HeroStage />
      </div>
    </section>
  );
}
