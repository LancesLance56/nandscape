import { cn } from "@/lib/cn";
import { initialsFor } from "@/lib/community/format";

/**
 * The copper disc that stands in for a face.
 *
 * Deliberately not `components/ui/avatar`: that one frames an uploaded image,
 * and nobody here has one. Initials in the mono face, on the accent tint, read
 * as a label rather than as a missing photo - and they cost no request, never
 * fail to load, and cannot leak a third-party avatar host into the page.
 *
 * Takes a handle and nothing else. People are identified by handle across the
 * whole site; there is no display-name field to fall back to.
 */

const SIZES = {
  xs: "h-5.5 w-5.5 text-[10px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-8.5 w-8.5 text-xs",
  xl: "h-16 w-16 text-xl",
} as const;

export function AvatarDisc({
  username,
  size = "md",
  muted = false,
  className,
}: {
  username: string;
  size?: keyof typeof SIZES;
  /** The quieter variant used on a reply, so it sits under its parent. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-mono font-semibold",
        muted ? "bg-surface-2 text-ink-soft" : "bg-copper-bg text-copper-dark",
        SIZES[size],
        className,
      )}
    >
      {initialsFor(username)}
    </span>
  );
}
