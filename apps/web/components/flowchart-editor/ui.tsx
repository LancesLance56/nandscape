"use client";

/**
 * The chrome vocabulary: menus, toolbar buttons, inspector blocks.
 *
 * Kept apart from the surfaces that use them so the dock, the contextual bar
 * and the inspector cannot drift into looking like three different
 * applications, which is the failure mode of every toolbar assembled button by
 * button.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------
 * Dropdown
 * ---------------------------------------------------------------------- */

export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Menu({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 mt-0.5 min-w-44 rounded-md border border-fe-line bg-fe-panel p-1 shadow-lg",
        className,
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  icon,
  shortcut,
  active,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fe-ink transition-colors",
        disabled ? "opacity-40" : "hover:bg-fe-hover",
        active && "bg-fe-accent-soft font-semibold",
      )}
    >
      {icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center text-fe-muted">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="shrink-0 text-[10px] text-fe-muted">{shortcut}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-fe-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fe-muted">{children}</div>;
}

/* -------------------------------------------------------------------------
 * Toolbar
 * ---------------------------------------------------------------------- */

/**
 * One command in the contextual bar.
 *
 * Icon only, 28px, no label. That is the whole difference between this bar and
 * a ribbon: a ribbon shows every command at all times and needs a caption
 * under each to stay legible, whereas this shows only the commands that apply
 * to what is selected, and a set of six or eight icons does not need captions.
 */
export function ToolbarButton({
  icon,
  label,
  onClick,
  menu,
  disabled,
  active,
  wide,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  menu?: (close: () => void) => ReactNode;
  disabled?: boolean;
  active?: boolean;
  /** Let the content set the width, for a button showing a value. */
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={() => (menu ? setOpen((v) => !v) : onClick?.())}
        className={cn(
          "flex h-7 items-center justify-center gap-1 rounded-md text-[11px] transition-colors",
          wide ? "px-1.5" : "w-7",
          disabled ? "cursor-default text-fe-disabled" : "text-fe-ink hover:bg-fe-hover",
          (active || open) && !disabled && "bg-fe-accent-soft text-fe-accent-strong",
        )}
      >
        {icon}
      </button>
      {open && menu && <Menu>{menu(() => setOpen(false))}</Menu>}
    </div>
  );
}

/** A colour button: the current value as a bar under a glyph. */
export function Swatch({
  color,
  label,
  glyph,
  disabled,
  children,
}: {
  color: string;
  label: string;
  glyph: ReactNode;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  return (
    <ToolbarButton
      label={label}
      disabled={disabled}
      icon={
        <span className="flex flex-col items-center leading-none">
          <span className="text-fe-icon">{glyph}</span>
          <span
            className="mt-[3px] h-[3px] w-4 rounded-sm border border-fe-line"
            style={{ background: color === "transparent" ? "repeating-linear-gradient(45deg,#bbb,#bbb 2px,#fff 2px,#fff 4px)" : color }}
          />
        </span>
      }
      menu={children}
    />
  );
}

export function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-fe-line" />;
}

/** A labelled group in the bar, so the contextual clusters read as clusters. */
export function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-0.5">{children}</div>;
}

/** A compact square toggle, for the character-format run. */
export function MiniButton({
  children,
  onClick,
  active,
  title,
  disabled,
  menu,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  menu?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        disabled={disabled}
        onClick={() => (menu ? setOpen((v) => !v) : onClick?.())}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors",
          disabled ? "text-fe-disabled" : "text-fe-ink hover:bg-fe-hover",
          active && "bg-fe-accent-soft text-fe-accent-strong",
        )}
      >
        {children}
      </button>
      {open && menu && <Menu className="min-w-0">{menu(() => setOpen(false))}</Menu>}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Panel
 * ---------------------------------------------------------------------- */

/** A collapsible block in the inspector. */
export function PanelSection({
  title,
  children,
  defaultOpen = false,
  onClose,
  dense,
}: {
  title: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
  dense?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={cn("rounded border border-fe-line bg-fe-panel-2", dense && "border-0 bg-transparent")}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-fe-ink"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-fe-muted" strokeWidth={2.5} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-fe-muted" strokeWidth={2.5} />
          )}
          {title}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Hide ${title}`}
            className="mr-1 rounded p-1 text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
          </button>
        )}
      </div>
      {open && children && (
        <div id={id} className="px-2 pb-2">
          {children}
        </div>
      )}
    </section>
  );
}

export const fieldCls =
  "h-6 rounded border border-fe-line bg-fe-field px-1.5 text-[11px] text-fe-ink outline-none focus:border-fe-accent";
