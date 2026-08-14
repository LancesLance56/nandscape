"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { Card } from "@/components/ui/card";

/**
 * A real <iframe> of /logic-editor, not a mockup - the actual editor (real
 * palette, real inspector, real live simulation), running in its own
 * browsing context so it can't collide with any editor state on this page
 * (there isn't any: the homepage never mounts the real editor stores
 * itself). Signed-in visitors see their own saved sandbox, same as opening
 * /logic-editor directly; everyone else sees the default starter circuit.
 */
export function LiveDemo() {
  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-sm font-medium text-copper-dark">
          <span className="h-1.75 w-1.75 rounded-full bg-copper" />
          Try it right here
        </div>
        <h2 className="text-3xl font-semibold text-ink">Logic Gate Editor</h2>
        <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
          Design your own logic gate projects in Nandscape with our beginner-friendly editor
        </p>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <Card className="overflow-hidden">
          <iframe
            src="/logic-editor"
            title="Nandscape logic editor"
            loading="lazy"
            className="h-[420px] w-full border-0 sm:h-[520px] md:h-[600px]"
          />
        </Card>
      </ScrollReveal>
    </section>
  );
}
