import Link from "next/link";
import {CircuitDemoCard} from "@/components/marketing/circuit-demo-card";

export function Hero() {
  return (
    <section className="relative grid gap-14 overflow-hidden pb-20 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
      <div className="relative z-10 pt-3">
        <div className="mb-5.5 flex items-center gap-2 font-mono text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper"/>
          Programming with gates
        </div>

        <h1
          className="mb-5.5 max-w-xl font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink lg:text-6xl lg:leading-[1.1]">
          Solve <span className="text-copper">Puzzles,</span> <br/> Learn{" "}
          <span className="text-copper">Interactively.</span>
        </h1>

        <p className="max-w-xl text-lg leading-8 text-ink-soft">
          Learn digital logic by{" "}
          <span className="text-ink">
            building real circuits
          </span>{" "}
          instead of memorizing truth tables.

          <br className="hidden sm:block" />

          Progress through{" "}
          <span className="font-medium text-copper">
            interactive puzzles
          </span>{" "}
          and{" "}
          <span className="font-medium text-copper">
            guided tutorials
          </span>{" "}
          that teach each concept one step at a time, with{" "}
          <span className="text-ink">
            instant visual feedback
          </span>{" "}
          as every wire comes to life.
        </p>
        <br/>

        <div className="flex flex-wrap items-center gap-3.5">
          <Link
            href="/puzzles"
            className="rounded-xl bg-copper px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-copper-dark"
          >
            Try a random puzzle
          </Link>
          <Link
            href="/nandbox"
            className="rounded-xl border border-border-strong bg-transparent px-7 py-3.5 text-base font-semibold text-ink transition-colors hover:border-ink-soft"
          >
            Open the sandbox
          </Link>
        </div>

        <div className="mt-8.5 flex flex-wrap items-center gap-4.5 font-mono text-[13px] text-slate">
          <span>Track Your Progress</span>
          <span className="text-border-strong">·</span>
          <span>Custom Blocks</span>
          <span className="text-border-strong">·</span>
          <span>Fun and Interactive</span>
        </div>
      </div>

      <div className="relative z-10">
        <CircuitDemoCard/>
      </div>
    </section>
  );
}
