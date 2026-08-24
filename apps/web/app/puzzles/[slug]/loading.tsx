import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

/**
 * The puzzle route mounts a full-bleed CircuitEditor with no navbar, so this
 * stands in for the editor chrome rather than for a document: a toolbar strip,
 * the canvas, and the side panel that holds the gate tray and test results.
 *
 * `h-screen` matches the editor rather than growing with content, so the
 * handoff does not jump the scroll position.
 */
export default function PuzzleLoading() {
  return (
    <div className="flex h-screen flex-col">
      <SkeletonScreen label="Loading puzzle editor">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="hidden w-56 shrink-0 flex-col gap-2.5 border-r border-border p-4 sm:flex">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>

          <div className="min-w-0 flex-1 p-4">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>

          <div className="hidden w-72 shrink-0 flex-col gap-3 border-l border-border p-4 lg:flex">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </SkeletonScreen>
    </div>
  );
}
