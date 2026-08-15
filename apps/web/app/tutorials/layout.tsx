import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { TutorialSidebar } from "@/components/tutorials/tutorial-sidebar";
import { listTutorialNav } from "@/lib/tutorials/tutorials";
import { listTutorialTrackTrees } from "@/lib/tutorials/tutorial-tracks";
import type { TutorialNavTree, TutorialTrackTree } from "@/types/tutorial";
import React from "react";

export default async function TutorialsLayout({ children }: { children: React.ReactNode }) {
  let tree: TutorialNavTree;
  let tracks: TutorialTrackTree[];
  try {
    [tree, tracks] = await Promise.all([listTutorialNav(), listTutorialTrackTrees()]);
  } catch {
    tree = { standalone: [], sections: [] };
    tracks = [];
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto flex max-w-330 flex-col gap-4 px-4 pb-24 pt-28 sm:px-10 lg:flex-row lg:gap-6 lg:pt-32">
        <TutorialSidebar tree={tree} tracks={tracks} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  );
}