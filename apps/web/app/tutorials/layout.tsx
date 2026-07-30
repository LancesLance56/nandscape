import { Navbar } from "@/components/navbar";
import { TutorialSidebar } from "@/components/tutorials/tutorial-sidebar";
import { listTutorialNav } from "@/lib/tutorials/tutorials";
import React from "react";

export default async function TutorialsLayout({ children }: { children: React.ReactNode }) {
  let tree;
  try {
    tree = await listTutorialNav();
  } catch {
    tree = { standalone: [], sections: [] };
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto flex max-w-330 gap-6 px-6 pb-24 pt-32 sm:px-10">
        <TutorialSidebar tree={tree} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}