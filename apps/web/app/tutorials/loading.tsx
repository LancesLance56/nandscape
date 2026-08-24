import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

/**
 * Navbar and Footer come from app/tutorials/layout.tsx, so this renders bare.
 *
 * It also covers the moment app/tutorials/[track]/layout.tsx is fetching its
 * track tree, which is why the shape stays close to the directory page rather
 * than to any one lesson.
 */
function TrackRailSkeleton() {
  return (
    <section className="grid gap-6 border-t border-border-strong pt-7 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-3.5 w-32" />
        <SkeletonText lines={2} className="mt-3.5" />
      </div>
      <div className="flex flex-col gap-7">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-40" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} className="h-3.5 w-full max-w-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TutorialsLoading() {
  return (
    <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
      <SkeletonScreen label="Loading tutorials">
        <div className="mb-12 max-w-2xl">
          <Skeleton className="h-11 w-full max-w-lg sm:h-12" />
          <SkeletonText lines={2} className="mt-5" />
        </div>
        <div className="flex flex-col gap-12">
          {Array.from({ length: 2 }, (_, i) => (
            <TrackRailSkeleton key={i} />
          ))}
        </div>
      </SkeletonScreen>
    </main>
  );
}
