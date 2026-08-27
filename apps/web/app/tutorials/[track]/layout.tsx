import { TutorialSidebar } from "@/components/tutorials/tutorial-sidebar";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import type { TutorialTrackTree } from "@/types/tutorial";
import React from "react";

/**
 * The sidebar lives here rather than in the parent layout so /tutorials
 * (the directory) renders full width without it.
 *
 * `items-start` on the row matters: without it the flex default stretches
 * the aside to the row's full height, and a sticky child of a
 * full-height column has nothing left to stick within. That's what made
 * the old rail drift as you neared the bottom of a long lesson.
 *
 * The row is full-bleed (no `max-w`/`mx-auto`) so the sidebar sits flush
 * against the viewport edge like a real app rail; the lesson column
 * re-centres itself with its own `max-w`.
 */
export default async function TutorialTrackLayout({ children }: { children: React.ReactNode }) {
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  return (
    <div className="flex flex-col px-5 pb-32 pt-28 sm:px-8 lg:flex-row lg:items-start lg:px-0 lg:pb-0 lg:pt-36">
      <TutorialSidebar tracks={tracks} />
      {/* The lesson column is a fixed-max-width block centred in the space
          left of the (fixed-width) sidebar. Because the sidebar keeps its
          width whether expanded or collapsed, this centre never shifts when
          the rail is toggled. */}
      <main className="min-w-0 flex-1 lg:pb-32 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
