"use client";

import { cn } from "@/lib/cn";

/**
 * The small form and button vocabulary the flowchart editor is built from.
 *
 * Split out of the panels themselves purely so the studio and the embedded
 * widget cannot drift into looking like two different products.
 */

export const inputCls =
  "w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none transition-colors focus:border-copper";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-snug text-slate">{hint}</span>}
    </label>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-3.5 py-3 last:border-b-0">
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </section>
  );
}

export function Btn({
  onClick,
  children,
  tone = "plain",
  disabled,
  title,
  active,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "plain" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "primary" && "border-copper bg-copper text-white hover:bg-copper-dark",
        tone === "danger" && "border-border-strong text-signal-coral hover:bg-signal-coral-bg",
        tone === "plain" &&
          (active
            ? "border-copper bg-copper-bg text-copper-dark"
            : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink"),
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A bare icon button for the top bar, where labels would not fit. */
export function IconBtn({
  onClick,
  label,
  children,
  disabled,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        active
          ? "border-copper bg-copper-bg text-copper-dark"
          : "border-transparent text-ink-soft hover:border-border-strong hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-copper"
      />
      {label}
    </label>
  );
}

/** Keyboard hint, e.g. next to a menu item. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border-strong bg-surface px-1 py-px font-mono text-[9px] font-semibold text-slate">
      {children}
    </kbd>
  );
}
