import { TutorialSidebar } from "@/components/tutorials/tutorial-sidebar";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import type { TutorialTrackTree } from "@/types/tutorial";
import React from "react";

/**
 * The sidebar lives here rather than in the parent layout so /tutorials
 * (the directory) renders without it.
 *
 * The rail is a hidden-by-default overlay that positions itself (fixed), so
 * this layout is just a single centred reading column. Because the rail never
 * takes up layout space - open or closed - the lesson text stays centred in
 * the viewport at all times and never shifts when the rail is toggled.
 */
export default async function TutorialTrackLayout({ children }: { children: React.ReactNode }) {
  let tracks: TutorialTrackTree[] = [];
  try {
    tracks = await listTutorialTrackTrees();
  } catch {
    tracks = [];
  }

  return (
    <div className="px-5 pb-32 pt-28 sm:px-8 lg:pt-36">
      <TutorialSidebar tracks={tracks} />
      <main className="mx-auto w-full max-w-5xl">{children}</main>
    </div>
  );
}
