import {create} from "zustand";
import type {Command, CommandContext} from "@/lib/commands/command";
import {isUndoable} from "@/lib/commands/command";

const MAX_HISTORY = 200;

const ctx: CommandContext = {now: () => Date.now()};

export interface HistoryState {
  past: Command<unknown>[];
  future: Command<unknown>[];

  run: <T>(command: Command<T>) => T;
  undo: () => void;
  redo: () => void;
  clear: () => void;

  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  run: (command) => {
    const result = command.execute(ctx);

    if (isUndoable(command)) {
      set((state) => ({
        past: [...state.past, command as Command<unknown>].slice(-MAX_HISTORY),
        future: [],
      }));
    }

    return result;
  },

  undo: () => {
    const {past} = get();
    const command = past[past.length - 1];
    if (!command?.undo) return;

    command.undo(ctx);
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [command, ...state.future],
    }));
  },

  redo: () => {
    const {future} = get();
    const command = future[0];
    if (!command) return;

    command.execute(ctx);
    set((state) => ({
      past: [...state.past, command],
      future: state.future.slice(1),
    }));
  },

  clear: () => set({past: [], future: []}),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
