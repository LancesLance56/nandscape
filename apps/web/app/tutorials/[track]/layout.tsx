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
 */
export default async function TutorialTrackLayout({ children }: { children: React.ReactNode }) {
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  return (
    <div className="mx-auto flex max-w-330 flex-col gap-4 px-4 pb-24 pt-28 sm:px-10 lg:flex-row lg:items-start lg:gap-8 lg:pt-32">
      <TutorialSidebar tracks={tracks} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
