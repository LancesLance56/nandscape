import { ScrollReveal } from "@/components/scroll-reveal";

const STATS = [
  {
    value: "10+",
    label: "Logic Puzzles",
    body: "Progress from basic gates to complete combinational circuits.",
  },
  {
    value: "< 1ms",
    label: "Live Simulation",
    body: "Every wire and gate updates instantly as you build and experiment.",
  },
  {
    value: "Personalized",
    label: "Workspace",
    body: "Save progress, create reusable blocks, learn, and build your own library of circuits.",
  },
];

export function FeatureStrip() {
  return (
    <section className="relative py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong/50 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong/50 to-transparent"
      />

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STATS.map((stat, i) => (
          <ScrollReveal
            key={stat.label}
            delay={i * 100}
            className="flex flex-col"
          >
            <span className="font-display text-4xl font-bold text-copper">
              {stat.value}
            </span>

            <h3 className="mt-2 text-lg font-semibold text-ink">
              {stat.label}
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {stat.body}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}