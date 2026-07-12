"use client";

import {useEffect, useRef, useState} from "react";
import {commandRegistry} from "@/lib/commands/registry";
import {ALL_REGISTERED_COMMANDS} from "@/lib/commands/commands/registered-commands";
import {shortcutRegistry} from "@/lib/keyboard/shortcut-registry";
import {DEFAULT_SHORTCUTS} from "@/lib/keyboard/default-shortcuts";
import {useKeyboardShortcuts} from "@/hooks/use-keyboard-shortcuts";
import {useEditorStore} from "@/store/editor-store";
import {getDefaultCircuit} from "@/lib/editor/default-circuits";
import {EditorLayout} from "./layout/editor-layout";


export function CircuitEditor() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    commandRegistry.registerAll(ALL_REGISTERED_COMMANDS);
    shortcutRegistry.registerAll(DEFAULT_SHORTCUTS);

    const store = useEditorStore.getState();
    if (store.nodes.length === 0) {
      const starter = getDefaultCircuit("half-adder");
      if (starter) {
        const {nodes, edges} = starter.build();
        store.setNodes(nodes);
        store.setEdges(edges);
      }
    }
  }, []);
  useKeyboardShortcuts();

  return (
    <div className="h-full w-full overflow-hidden bg-surface">
      <EditorLayout/>
    </div>
  );
}
