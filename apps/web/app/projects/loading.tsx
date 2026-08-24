import { Navbar } from "@/components/navbar";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
        <SkeletonScreen label="Loading projects">
          <Skeleton className="h-10 w-64 sm:h-11" />
          <SkeletonText lines={2} className="mt-4" />

          <div className="mt-10 flex flex-col gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-card p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-16 shrink-0 rounded-lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-3.5 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
    </>
  );
}
