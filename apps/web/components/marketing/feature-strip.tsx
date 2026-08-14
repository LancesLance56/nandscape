import { ScrollReveal } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";

const STATS = [
  {
    label: "Personalize your workspace",
    title: "Custom blocks",
    body: "Create your own custom blocks to help solve puzzles and create complex projects, accessible each time you sign in.",
  },
  {
    label: "Instant feedback",
    title: "Live simulation",
    body: "Every wire and gate updates instantly as you build and experiment.",
  },
  {
    label: "Learn interactively",
    title: "Track your progress",
    body: "Practice through hands-on experience by doing puzzles, assigned tasks, and interactive tutorials.",
  },
];

export function FeatureStrip() {
  return (
    <section className="py-14">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map((stat, i) => (
          <ScrollReveal key={stat.title} delay={i * 100}>
            <Card className="flex h-full flex-col p-6">
              <span className="text-xs font-semibold text-copper-dark">{stat.label}</span>
              <h3 className="mt-2 text-lg font-semibold text-ink">{stat.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{stat.body}</p>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}