import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";
import { SortingVisualizerWidget } from "@/components/content/blocks/interactive/sorting/sorting-visualizer-widget";

/**
 * The sorting visualizer, rendered directly rather than through an iframe
 * (unlike the logic editor below it, which needs its own browsing context
 * for the editor stores). It runs with frame={false} so the marketing Card
 * provides the chrome instead of stacking a second window frame inside one.
 */
export function SortingShowcase() {
  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper" />
          Watch it run
        </div>
        <h2 className="text-3xl font-semibold text-ink">Sorting Algorithm Visualizer</h2>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Seven algorithms, one frame at a time, with the comparison and write counts running underneath. Change the
          input shape and watch which ones notice.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <Card className="p-5 sm:p-6">
          <SortingVisualizerWidget
            data={{ algorithm: "quick", preset: "random", size: 18, seed: 20260816 }}
            frame={false}
          />
        </Card>
      </ScrollReveal>

      <ScrollReveal delay={150} className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/tools/sorting-algorithm-visualizer"
          className="rounded-xl bg-copper px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-copper-dark"
        >
          Open the full visualizer →
        </Link>
        <Link
          href="/tutorials/dsa/sorting-introduction"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md"
        >
          Learn how sorting works
        </Link>
      </ScrollReveal>
    </section>
  );
}
