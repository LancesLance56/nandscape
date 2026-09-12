import { ScrollReveal } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "./section-header";

/**
 * The green accent, then two ink-wash tonal steps beside it - a deliberate
 * trio rather than three hues competing.
 *
 * Written as token expressions rather than the three literal hexes these used
 * to be. The first of those was the light-mode green, which on the dark card
 * ground came out at roughly 3:1 against 12px semibold text; every one of
 * these now inherits whatever the theme has decided `--copper` and
 * `--ink-soft` are.
 */
const FEATURE_ACCENTS = [
  "var(--copper)",
  "color-mix(in oklab, var(--copper) 45%, var(--ink-soft))",
  "var(--ink-soft)",
] as const;

function BlocksIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="7" y="11.5" width="6" height="6" rx="1.2" />
    </svg>
  );
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10.5h4l1.8-5 3 9 1.8-5.5h5.4" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 14.5l5-5.5 3.5 3 6.5-7.5" />
      <path d="M13 4.5h4.5V9" />
    </svg>
  );
}

const STATS = [
  {
    icon: BlocksIcon,
    label: "Personalize your workspace",
    title: "Custom blocks",
    body: "Create your own custom blocks to help solve puzzles and create complex projects, accessible each time you sign in.",
  },
  {
    icon: PulseIcon,
    label: "Instant feedback",
    title: "Live simulation",
    body: "Every wire and gate updates instantly as you build and experiment.",
  },
  {
    icon: TrendUpIcon,
    label: "Learn interactively",
    title: "Track your progress",
    body: "Practice through hands-on experience by doing puzzles, assigned tasks, and interactive tutorials.",
  },
];

export function FeatureStrip() {
  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader eyebrow="Features" title="Made for hands-on learning" />
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map((stat, i) => {
          const color = FEATURE_ACCENTS[i];
          const Icon = stat.icon;

          return (
            <ScrollReveal key={stat.title} delay={i * 100}>
              <Card className="flex h-full flex-col p-6">
                <div
                  style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                >
                  <Icon className="h-5 w-5" />
                </div>
                {/* Same mono-caps label the section heads use, so a card's
                    kicker and a section's kicker are the same object. */}
                <span
                  className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color }}
                >
                  {stat.label}
                </span>
                <h3 className="mt-2.5 font-display text-lg font-semibold text-ink">{stat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{stat.body}</p>
              </Card>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
