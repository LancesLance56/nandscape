import type { ComponentType } from "react";
import { Info, Lightbulb, TriangleAlert, CircleAlert } from "lucide-react";
import { RichText } from "./rich-text";
import { cn } from "@/lib/cn";
import type { CalloutBlock, CalloutTone } from "@/types/blog";

interface ToneStyle {
  /** Wrapper: tinted background + left accent bar colour. */
  wrapper: string;
  /** Icon colour. */
  icon: string;
  /** Title colour. */
  title: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
}

/**
 * The callout frame and its tones, exported so the Markdown renderer can dress
 * a `>` blockquote as the neutral (grey) callout rather than inventing a
 * second quote style.
 */
export const CALLOUT_FRAME_CLASS = "not-prose flex gap-3 rounded-xl border-l-4 px-4 py-3.5";

export const CALLOUT_TONES: Record<CalloutTone, ToneStyle> = {
  note: {
    wrapper: "border-border-strong bg-surface-2",
    icon: "text-slate",
    title: "text-ink",
    Icon: Info,
    label: "Note",
  },
  tip: {
    wrapper: "border-signal-green bg-signal-green-bg",
    icon: "text-signal-green-strong",
    title: "text-signal-green-strong",
    Icon: Lightbulb,
    label: "Tip",
  },
  warning: {
    wrapper: "border-signal-coral bg-signal-coral-bg",
    icon: "text-signal-coral-strong",
    title: "text-signal-coral-strong",
    Icon: TriangleAlert,
    label: "Warning",
  },
  important: {
    wrapper: "border-copper bg-copper-bg",
    icon: "text-copper-dark",
    title: "text-copper-dark",
    Icon: CircleAlert,
    label: "Important",
  },
};

export function CalloutBlockView({ block }: { block: CalloutBlock & { className?: string } }) {
  const tone = CALLOUT_TONES[block.tone] ?? CALLOUT_TONES.note;
  const { Icon } = tone;
  const heading = block.title?.trim() || tone.label;

  return (
    <div
      className={cn(
        CALLOUT_FRAME_CLASS,
        tone.wrapper,
        block.className,
      )}
    >
      <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", tone.icon)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", tone.title)}>{heading}</p>
        <div className="mt-1 text-sm leading-relaxed text-ink-soft">
          <RichText spans={block.content} />
        </div>
      </div>
    </div>
  );
}
