"use client";

/**
 * The chrome vocabulary: ribbon buttons, dropdowns, panel sections.
 *
 * Kept apart from the panels that use them so the ribbon and the SmartPanel
 * cannot drift into looking like two different applications, which is the
 * failure mode of every toolbar assembled button by button.
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
 * Ribbon
 * ---------------------------------------------------------------------- */

/**
 * One ribbon command: an icon over a label, optionally with a caret that opens
 * a menu. The caret is a separate hit area when the button also does something
 * on its own, and the whole button otherwise - the same split Office and
 * SmartDraw use, and the reason "Paste" can be both a button and a menu.
 */
export function RibbonButton({
  icon,
  label,
  onClick,
  menu,
  disabled,
  active,
  title,
  splitAction,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  menu?: (close: () => void) => ReactNode;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  /** True when clicking the body does something distinct from opening the menu. */
  splitAction?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const hasMenu = Boolean(menu);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title ?? label}
        disabled={disabled}
        onClick={() => {
          if (hasMenu && !splitAction) setOpen((v) => !v);
          else onClick?.();
        }}
        className={cn(
          "flex h-14 min-w-[52px] flex-col items-center justify-center gap-1 rounded px-2 pb-1 pt-1.5 text-[10px] leading-none transition-colors",
          disabled ? "cursor-default text-fe-disabled" : "text-fe-ink hover:bg-fe-hover",
          active && "bg-fe-accent-soft",
          open && "bg-fe-hover",
        )}
      >
        <span className={cn("flex h-5 items-center justify-center", disabled ? "text-fe-disabled" : "text-fe-icon")}>
          {icon}
        </span>
        <span className="flex items-center gap-0.5 whitespace-nowrap">
          {label}
          {hasMenu && !splitAction && <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />}
        </span>
      </button>
      {hasMenu && splitAction && (
        <button
          type="button"
          aria-label={`${label} options`}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="absolute bottom-0.5 right-0 rounded p-0.5 text-fe-muted hover:bg-fe-hover"
        >
          <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.5} />
        </button>
      )}
      {open && menu && <Menu>{menu(() => setOpen(false))}</Menu>}
    </div>
  );
}

/** A compact square toggle, for the character-format row. */
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
          "flex h-6 w-6 items-center justify-center rounded text-[12px] transition-colors",
          disabled ? "text-fe-disabled" : "text-fe-ink hover:bg-fe-hover",
          active && "bg-fe-accent-soft",
        )}
      >
        {children}
      </button>
      {open && menu && <Menu className="min-w-0">{menu(() => setOpen(false))}</Menu>}
    </div>
  );
}

export function RibbonGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-stretch gap-0.5">{children}</div>;
}

export function RibbonDivider() {
  return <div className="mx-1 my-2 w-px shrink-0 bg-fe-line" />;
}

/* -------------------------------------------------------------------------
 * Panel
 * ---------------------------------------------------------------------- */

/** A collapsible strip in the left panel, matching SmartDraw's SmartPanel. */
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
