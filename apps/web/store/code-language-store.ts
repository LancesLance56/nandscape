import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CodeLanguageState {
  /** The reader's last explicit pick, e.g. "python". Null until they choose. */
  preferred: string | null;
  setPreferred: (language: string) => void;
}

/**
 * Shared so that choosing Python on one snippet switches every other snippet
 * on the page that offers Python, the way most language-tabbed docs behave.
 * Blocks that don't have the preferred language just stay on their own first
 * tab rather than falling back to something the author didn't write.
 */
export const useCodeLanguageStore = create<CodeLanguageState>()(
  persist(
    (set) => ({
      preferred: null,
      setPreferred: (language) => set({ preferred: language }),
    }),
    { name: "nandscape-code-language" },
  ),
);
