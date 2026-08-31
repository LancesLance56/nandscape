"use client";

import type { ReactNode } from "react";
import { useIsEmbedded } from "@/components/embeds/embed-chrome";
import { cn } from "@/lib/cn";

interface WidgetFrameProps {
  title: string;
  subtitle?: string;
  /**
   * A link or control for the title bar, e.g. "open the full version". Kept
   * out of the widget body so it does not read as one of the widget's own
   * controls.
   */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WidgetFrame({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
}: WidgetFrameProps) {
  const embedded = useIsEmbedded();

  // Inside an embed the host page has already provided the box and the
  // caption, so everything this component draws would be duplication. See
  // components/embeds/embed-chrome.tsx. The widget itself is unchanged.
  if (embedded) {
    return <div className={cn("not-prose", contentClassName)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "not-prose overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)] ",
        className,
      )}
    >
      {/* No macOS-style window dots. They dressed every demo up as a little
          application window, which is decoration the reader gains nothing
          from - the widget already shows what it is. */}
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className=" text-[11px] font-semibold text-ink">{title}</span>
        {subtitle && <span className="ml-auto text-[10px] text-slate">{subtitle}</span>}
        {action && <span className={cn(subtitle ? "" : "ml-auto")}>{action}</span>}
      </div>
      <div
        className={cn(
          "bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] p-5 sm:p-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
