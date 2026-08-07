import { create } from "zustand";
import type { ProjectVisibility } from "@/lib/projects/projects";

export type ProjectSaveStatus = "idle" | "saving" | "saved" | "error";

export interface ActiveProject {
  id: string;
  slug: string;
  name: string;
  visibility: ProjectVisibility;
}

interface ProjectState {
  active: ActiveProject | null;
  saveStatus: ProjectSaveStatus;

  setActive: (project: ActiveProject | null) => void;
  setSaveStatus: (status: ProjectSaveStatus) => void;
  patchActive: (patch: Partial<ActiveProject>) => void;
}

// Not persisted,  the server (via the projects API) is the source of truth
// for anything beyond the current tab's session.
export const useProjectStore = create<ProjectState>((set) => ({
  active: null,
  saveStatus: "idle",

  setActive: (project) => set({ active: project, saveStatus: "idle" }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  patchActive: (patch) => set((s) => (s.active ? { active: { ...s.active, ...patch } } : s)),
}));
