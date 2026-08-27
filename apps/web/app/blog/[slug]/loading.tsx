import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-28 pt-32 sm:px-10">
        <SkeletonScreen label="Loading post">
          <div className="mx-auto max-w-[72ch]">
            <Skeleton className="h-9 w-full sm:h-11" />
            <Skeleton className="mt-3 h-9 w-2/3 sm:h-11" />
            <Skeleton className="mt-5 h-4 w-56" />
            <SkeletonText lines={2} className="mt-5" />
            <Skeleton className="mt-8 aspect-16/9 w-full rounded-2xl" />

            <Skeleton className="mt-8 mb-10 h-px w-full" />

            <div className="flex flex-col gap-8">
              <SkeletonText lines={4} />
              <SkeletonText lines={3} />
              <Skeleton className="h-56 w-full rounded-xl" />
              <SkeletonText lines={4} />
            </div>
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
