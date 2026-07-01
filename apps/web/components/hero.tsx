import { Button } from "@/components/ui/button";
import { PuzzleCard } from "@/components/puzzle-card";

export function Hero() {
  return (
    <>
      <section className="relative grid gap-14 overflow-hidden py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:py-15">
        <div className="relative z-10 pt-3">
          <div className="mb-5.5 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper"/>
            Programming with gates
          </div>

          <h1
            className="mb-5.5 max-w-xl font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink lg:text-[4em] lg:leading-[1.1]">
            Solve <span className="text-copper">Puzzles,</span> <br/> Learn{" "}
            <span className="text-copper">Interactively.</span>
          </h1>

          <p className="mb-8.5 max-w-md text-lg leading-relaxed text-ink-soft">
            Nandscape teaches gate logic through puzzles. Program functionality
          </p>

          <div className="flex flex-wrap items-center gap-3.5">
            <Button variant="primary" size="lg">
              Try a random puzzle
            </Button>
            <Button variant="secondary" size="lg">
              Learn More
            </Button>
          </div>

          <div className="mt-8.5 flex flex-wrap items-center gap-4.5 font-mono text-[13px] text-slate">
            <span>40+ puzzles</span>
            <span className="text-border-strong">·</span>
            <span>6 chapters</span>
            <span className="text-border-strong">·</span>
            <span>free to start</span>
          </div>
        </div>

        <div className="relative z-10">
          <PuzzleCard/>
        </div>
      </section>
    </>
  );
}