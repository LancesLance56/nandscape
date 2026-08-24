import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

/**
 * A tool page leads with its widget rather than with prose, so the tall block
 * sits directly under the title instead of after a few paragraphs. Getting
 * that order right is the whole point: a skeleton that puts text where the
 * canvas lands makes the page jump when it swaps.
 */
export default function ToolLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <SkeletonScreen label="Loading tool">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-5 h-10 w-full max-w-lg sm:h-11" />
          <SkeletonText lines={2} className="mt-4" />

          <Skeleton className="mt-9 h-96 w-full rounded-xl" />

          <div className="mt-12 flex flex-col gap-8">
            <Skeleton className="h-6 w-48" />
            <SkeletonText lines={3} />
            <Skeleton className="h-6 w-40" />
            <SkeletonText lines={4} />
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
