import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

/**
 * Navbar and Footer come from app/tutorials/layout.tsx, so this renders bare.
 *
 * It also covers the moment app/tutorials/[track]/layout.tsx is fetching its
 * track tree, which is why the shape stays close to the directory page rather
 * than to any one lesson: a tinted track band, then a card per section.
 */
function TrackBlockSkeleton() {
  return (
    <section>
      <Skeleton className="h-36 w-full rounded-2xl sm:h-32" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-card p-4">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 5 }, (_, j) => (
                <Skeleton key={j} className="h-3.5 w-full" />
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
        <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <Skeleton className="h-3 w-44" />
            <Skeleton className="mt-3 h-11 w-64 sm:h-12" />
            <SkeletonText lines={2} className="mt-4" />
          </div>
          <div className="lg:pb-1">
            <div className="flex flex-wrap gap-x-10 gap-y-5 border-t border-border-strong pt-5">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-7 w-32 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          {Array.from({ length: 2 }, (_, i) => (
            <TrackBlockSkeleton key={i} />
          ))}
        </div>
      </SkeletonScreen>
    </main>
  );
}
