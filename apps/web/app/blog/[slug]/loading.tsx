import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <SkeletonScreen label="Loading post">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-10 w-full sm:h-12" />
          <Skeleton className="mt-3 h-10 w-2/3 sm:h-12" />

          <div className="mt-6 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>

          <Skeleton className="mt-10 aspect-16/9 w-full rounded-xl" />

          <div className="mt-12 flex flex-col gap-8">
            <SkeletonText lines={4} />
            <SkeletonText lines={3} />
            <Skeleton className="h-56 w-full rounded-xl" />
            <SkeletonText lines={4} />
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
