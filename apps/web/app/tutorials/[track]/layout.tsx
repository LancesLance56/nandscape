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
      {/* 952px (238 x 4px on the spacing scale).

          Between Tailwind's named steps - narrower than 5xl/1024px, wider than
          4xl/896px - and deliberately so: it was picked by eye against real
          lessons rather than snapped to the nearest token. Wide enough for the
          circuit embeds, flowcharts and visualisers a lesson is mostly made of,
          and tight enough that the prose is not running the width of a
          desktop. The exact number matters more here than the tidiness of a
          named step, so it is written as one.

          The `px-5 sm:px-8` gutters above are untouched - they are what a phone
          sees, and they are already as tight as the text wants to be. */}
      <main className="mx-auto w-full max-w-238">{children}</main>
    </div>
  );
}
