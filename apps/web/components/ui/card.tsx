import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A card is now only for framing something that genuinely needs a frame: a
 * live widget, a demo canvas, an image preview. Lists of links moved to the
 * rail (`components/ui/rail`), which reads the content instead of boxing it.
 *
 * What is left is deliberately quieter than before. The old card carried a
 * drop shadow, a 2xl radius and a lift-and-grow hover, which made six of them
 * in a grid compete with the page rather than sit on it.
 */
const BASE = "rounded-xl border border-border bg-surface-card";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(BASE, className)}>{children}</div>;
}

/**
 * The linked variant, kept for previews that lead with an image (projects,
 * community). The hover is a border and a tint rather than a translate, so a
 * grid of them stays still while the pointer moves across it.
 */
export function CardLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block transition-colors hover:border-border-strong hover:bg-surface-2/40",
        BASE,
        className,
      )}
    >
      {children}
    </Link>
  );
}
