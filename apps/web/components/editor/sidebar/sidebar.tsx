"use client";

import {useUiStore} from "@/store/ui-store";
import {ProblemPanel} from "./problem-panel";
import {ProjectsPanel} from "./projects-panel";

/**
 * The left panel: the problem you are solving, or the projects you have saved.
 *
 * There used to be a Projects/Problem tab strip across the top, and it was
 * chrome offering a choice that never existed. Which panel belongs here is
 * decided entirely by how the editor was opened - CircuitEditor sets it when
 * it loads, "problem" for a puzzle and "projects" for a project or the
 * sandbox - and the other tab is always the wrong one. Inside a puzzle,
 * Projects was a door out of the thing you had just clicked into; in the
 * sandbox, Problem was a panel whose entire content was a link telling you to
 * go and open a puzzle.
 *
 * So the strip is gone and the panel is whatever the context called for. The
 * store still carries `sidebarTab`, because something still has to say which
 * of the two this is - it is simply no longer a control.
 */
export function Sidebar() {
  const activeTab = useUiStore((s) => s.sidebarTab);

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex flex-1 flex-col overflow-y-auto">
        {activeTab === "problem" ? <ProblemPanel/> : <ProjectsPanel/>}
      </div>
    </div>
  );
}
