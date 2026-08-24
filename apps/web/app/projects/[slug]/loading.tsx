import { Navbar } from "@/components/navbar";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

/**
 * The project route renders a Navbar and then hands the rest of the viewport
 * to ProjectViewer, so the skeleton below the navbar is editor-shaped: a
 * canvas with a tool strip beside it, not a column of text.
 */
export default function ProjectLoading() {
  return (
    <>
      <Navbar />
      <SkeletonScreen label="Loading project">
        <div className="mx-auto flex max-w-330 flex-col gap-4 px-6 pb-24 pt-32 sm:px-10">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="ml-auto h-8 w-24 rounded-lg" />
          </div>

          <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
            <div className="hidden w-52 shrink-0 flex-col gap-2.5 lg:flex">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[32rem] min-w-0 flex-1 rounded-xl" />
          </div>
        </div>
      </SkeletonScreen>
    </>
  );
}
