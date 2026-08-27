import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

/**
 * Renders inside app/tutorials/[track]/layout.tsx, which already supplies the
 * navbar, the sidebar and the <main> wrapper. Only the lesson body belongs
 * here, and it deliberately leads with a wide title block and a run of prose,
 * because that is what almost every page under this segment opens with.
 */
export default function TutorialTrackLoading() {
  return (
    <SkeletonScreen label="Loading tutorial">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-9 w-full sm:h-11" />
        <Skeleton className="mt-3 h-4 w-32" />
        <SkeletonText lines={2} className="mt-5" />

        <Skeleton className="mt-8 mb-10 h-px w-full" />

        <div className="flex flex-col gap-9">
          <SkeletonText lines={4} />

          {/* Where an interactive widget usually sits. */}
          <Skeleton className="h-72 w-full rounded-xl" />

          <SkeletonText lines={3} />
          <Skeleton className="h-40 w-full rounded-xl" />
          <SkeletonText lines={4} />
        </div>
      </div>
    </SkeletonScreen>
  );
}
