import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Placeholder blocks for the gap between a navigation starting and the server
 * sending content.
 *
 * A skeleton is only worth showing when it is the same shape as the thing it
 * stands in for. A generic spinner tells the reader "wait"; a skeleton that
 * matches the real layout tells them what is coming and, more usefully, stops
 * the page reflowing when it arrives. So the screens in `loading.tsx` mirror
 * their page's container widths and column counts rather than being a stack of
 * grey bars at some convenient size.
 */

/**
 * One block.
 *
 * The pulse sits behind `motion-safe:` rather than running unconditionally. A
 * page of synchronised throbbing rectangles is exactly what someone with
 * vestibular sensitivity has reduced motion turned on to avoid, and a still
 * grey block still reads perfectly well as "nothing here yet".
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-surface-2 motion-safe:animate-pulse", className)} />;
}

/**
 * A run of lines standing in for a paragraph.
 *
 * The last line is short on purpose. Equal-width bars read as a table or a
 * stack of buttons; a ragged final line is what makes the block read as prose.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * Wraps a whole loading screen.
 *
 * Everything inside is hidden from assistive tech and replaced by a single
 * spoken label, because announcing a dozen empty rectangles helps nobody. The
 * inner wrapper is `display: contents` so it can sit straight inside a grid or
 * flex parent without adding a box that would break the parent's layout.
 */
export function SkeletonScreen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </>
  );
}
