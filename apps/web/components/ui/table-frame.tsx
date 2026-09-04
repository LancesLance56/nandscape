import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site's one table look: a rounded, bordered frame around a filled header
 * row and hairline-separated body rows.
 *
 * Kept as a frame plus a set of class names rather than a single `<Table>`
 * that takes rows, because the two callers need different things from the same
 * appearance. Blog and tutorial tables are static string grids and use
 * TableBlockView; Problem Studio's tables have inputs, selects and buttons in
 * their cells and have to write their own `<tr>`s. Sharing the classes is what
 * keeps those identical without forcing one of them through the other's API.
 */

export const tableClasses = {
  scroll: "overflow-x-auto",
  table: "w-full border-collapse text-sm",
  headRow: "bg-surface-2",
  th: "border-b border-border px-3 py-2 text-left text-[11px] font-semibold text-slate",
  row: "border-t border-border",
  td: "px-3 py-2 text-ink",
} as const;

export function TableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("not-prose overflow-hidden rounded-xl border border-border", className)}>
      {children}
    </div>
  );
}

/**
 * The horizontally scrolling area a wide table sits in.
 *
 * Separate from the frame so anything that belongs to the table but must not
 * scroll with it - a caption, a footer row of actions - can sit inside the
 * frame and outside this.
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className={tableClasses.scroll}>{children}</div>;
}
