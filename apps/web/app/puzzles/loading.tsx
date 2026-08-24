import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

export default function PuzzlesLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <SkeletonScreen label="Loading puzzles">
          <div className="mb-8 max-w-2xl">
            <Skeleton className="h-10 w-full max-w-md sm:h-11" />
            <SkeletonText lines={2} className="mt-4" />
          </div>

          {/* The daily puzzle card, which sits above the filterable list. */}
          <Skeleton className="mb-10 h-40 w-full rounded-xl" />

          <div className="mb-8 flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-card p-5">
                <Skeleton className="h-5 w-3/4" />
                <SkeletonText lines={2} className="mt-3" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
