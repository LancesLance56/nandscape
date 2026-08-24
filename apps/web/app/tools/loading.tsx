import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

export default function ToolsLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <SkeletonScreen label="Loading tools">
          <div className="mb-10 max-w-2xl">
            <Skeleton className="h-10 w-full max-w-sm sm:h-11" />
            <SkeletonText lines={2} className="mt-4" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-card p-5">
                <Skeleton className="h-5 w-2/3" />
                <SkeletonText lines={2} className="mt-3" />
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
