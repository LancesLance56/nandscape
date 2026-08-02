import { ScrollReveal } from "@/components/scroll-reveal";

const STATS = [
  {
    value: "Custom Blocks",
    label: "Personalize your workspace",
    body: "Create your own custom blocks to help solve puzzles and create complex projects, accessible each time you sign in.",
  },
  {
    value: "Live Simulation",
    label: "Instant Feedback",
    body: "Every wire and gate updates instantly as you build and experiment.",
  },
  {
    value: "Track Your Progress",
    label: "Learn Interactively",
    body: "Practice through hands-on experience by doing puzzles, assigned tasks, and interactive tutorials.",
  },
];

export function FeatureStrip() {
  return (
    <section className="relative py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border-strong/50 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-border-strong/50 to-transparent"
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