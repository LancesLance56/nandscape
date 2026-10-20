import type { ComponentType } from "react";
import { Info, Lightbulb, TriangleAlert, CircleAlert } from "lucide-react";
import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { CalloutBlock, CalloutTone } from "@/types/blog";

interface ToneStyle {
  /** Wrapper: the card's pastel fill. */
  wrapper: string;
  /** Icon colour, inside the round white badge. */
  icon: string;
  /** Title colour. */
  title: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
}

/**
 * The callout frame and its tones, exported so the Markdown renderer can dress
 * a `>` blockquote as the neutral callout rather than inventing a second quote
 * style. A callout is simply a pale box tinted in its colour - blue, green,
 * amber or red - with a matching border. None of them uses the orange accent,
 * so a callout never reads as a button or a link.
 */
export const CALLOUT_FRAME_CLASS = "not-prose flex gap-3 rounded-2xl border px-5 py-4 sm:px-6 sm:py-5";

export const CALLOUT_TONES: Record<CalloutTone, ToneStyle> = {
  note: {
    wrapper: "border-signal-blue/25 bg-signal-blue-bg",
    icon: "text-signal-blue",
    title: "text-signal-blue-strong",
    Icon: Info,
    label: "Note",
  },
  tip: {
    wrapper: "border-signal-green/25 bg-signal-green-bg",
    icon: "text-signal-green",
    title: "text-signal-green-strong",
    Icon: Lightbulb,
    label: "Tip",
  },
  warning: {
    wrapper: "border-pollen/40 bg-pollen-bg",
    icon: "text-pollen-strong",
    title: "text-pollen-strong",
    Icon: TriangleAlert,
    label: "Warning",
  },
  important: {
    wrapper: "border-signal-coral/25 bg-signal-coral-bg",
    icon: "text-signal-coral",
    title: "text-signal-coral-strong",
    Icon: CircleAlert,
    label: "Important",
  },
};

export function CalloutBlockView({ block }: { block: CalloutBlock & { className?: string } }) {
  const tone = CALLOUT_TONES[block.tone] ?? CALLOUT_TONES.note;
  const { Icon } = tone;
  const heading = block.title?.trim() || tone.label;

  return (
    <div className={cn(CALLOUT_FRAME_CLASS, "flex-col gap-2", tone.wrapper, block.className)}>
      <div className="flex items-center gap-2.5">
        <Icon className={cn("h-5 w-5 shrink-0", tone.icon)} />
        <p className={cn("font-semibold", tone.title)}>{heading}</p>
      </div>
      <div className="min-w-0 text-[0.95rem] leading-relaxed text-ink-soft">
        <RichText spans={block.content} />
      </div>
    </div>
  );
}
