import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SiteGradient } from "@/components/site-gradient";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/ui/skeleton";

/** Mirrors PostListItem: a 4:3 thumbnail with the title block beside it. */
function PostSkeleton() {
  return (
    <div className="flex gap-5">
      <Skeleton className="aspect-4/3 w-36 shrink-0 rounded-xl sm:w-44" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <Skeleton className="h-5 w-3/4 sm:h-6" />
        <SkeletonText lines={2} />
        <Skeleton className="mt-1 h-4 w-24" />
      </div>
    </div>
  );
}

export default function BlogIndexLoading() {
  return (
    <>
      <SiteGradient />
      <Navbar />
      <main className="relative pb-24">
        <SkeletonScreen label="Loading blog posts">
          <section className="px-6 pb-30 pt-52 sm:px-10">
            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
              <Skeleton className="mb-5 h-5 w-36 rounded-full" />
              <Skeleton className="h-12 w-full max-w-md sm:h-14" />
              <Skeleton className="mt-5 h-5 w-4/5" />
            </div>
          </section>

          <div className="relative z-10 mx-auto max-w-330 px-6 sm:px-10">
            <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-10">
                {Array.from({ length: 4 }, (_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-3.5 w-full" />
                ))}
              </div>
            </div>
          </div>
        </SkeletonScreen>
      </main>
      <Footer />
    </>
  );
}
