"use client";

import React, {useCallback} from "react";
import {useWireDraftStore} from "@/store/wire-draft-store";
import {useEditorStore} from "@/store/editor-store";
import {useCommandDispatch} from "@/hooks/use-command";
import {useScreenToFlowPosition} from "@/hooks/use-flow-position";
import {createConnectEdgeCommand} from "@/lib/commands/commands/connect-edge.command";
import {clampBusWidth, isBusToBusConnection} from "@/lib/editor/bus-utils";
import type {BusMergeNodeData, BusSplitNodeData, WireEdgeData} from "@/types/editor";

/**
 * A "bus-out"/"bus-in" handle stands in for `width` parallel single-bit
 * wires, so it can't be treated like an ordinary pin: it may only connect
 * to its exact counterpart (bus-out -> bus-in, never to a plain gate/IO
 * pin), and both ends must agree on width. Every other handle on a bus
 * node (in-i/out-i) is a normal single-bit pin and skips this entirely.
 * Returns the edge data to attach when the connection is a valid bus link,
 * `false` when a bus handle is being connected somewhere it shouldn't,
 * `true` (no extra data) for anything not bus-related.
 */
function checkBusConnection(
  sourceNodeId: string,
  sourceHandle: string | null,
  targetNodeId: string,
  targetHandle: string | null,
): Partial<WireEdgeData> | false {
  const isBusHandle = sourceHandle === "bus-out" || targetHandle === "bus-in";
  if (!isBusHandle) return {};

  const nodes = useEditorStore.getState().nodes;
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  if (!isBusToBusConnection(sourceNode, sourceHandle, targetNode, targetHandle)) return false;

  const mergeWidth = clampBusWidth((sourceNode!.data as BusMergeNodeData).width);
  const splitWidth = clampBusWidth((targetNode!.data as BusSplitNodeData).width);
  if (mergeWidth !== splitWidth) return false;

  return {isBus: true, busWidth: mergeWidth};
}

function getHandleCenter(
  handleEl: HTMLElement,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
) {
  const rect = handleEl.getBoundingClientRect();
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  return screenToFlowPosition(center);
}

export function useHandleClick() {
  const screenToFlowPosition = useScreenToFlowPosition();
  const dispatch = useCommandDispatch();

  const onHandleClick = useCallback(
    (nodeId: string, handleId: string | null, handleType: "source" | "target", event: React.MouseEvent) => {
      event.stopPropagation();
      const handleEl = event.currentTarget as HTMLElement;
      const draft = useWireDraftStore.getState().draft;
      const r = 4;
      const origin = getHandleCenter(handleEl, screenToFlowPosition);

      if (!draft) {
        useWireDraftStore.getState().start(nodeId, handleId, handleType, origin, r);
        return;
      }

      const compatible = draft.sourceHandleType !== handleType && draft.sourceNodeId !== nodeId;
      if (!compatible) {
        useWireDraftStore.getState().start(nodeId, handleId, handleType, origin, r);
        return;
      }

      const sourceIsDraft = draft.sourceHandleType === "source";
      const sourceNodeId = sourceIsDraft ? draft.sourceNodeId : nodeId;
      const sourceHandleId = sourceIsDraft ? draft.sourceHandleId : handleId;
      const targetNodeId = sourceIsDraft ? nodeId : draft.sourceNodeId;
      const targetHandleId = sourceIsDraft ? handleId : draft.sourceHandleId;

      const busData = checkBusConnection(sourceNodeId, sourceHandleId, targetNodeId, targetHandleId);
      if (busData === false) {
        // A bus trunk handle (bus-out/bus-in) being aimed at something that
        // isn't its exact counterpart,  same "start a new draft from here"
        // recovery the plain source/target mismatch above uses, since this
        // codebase has no toast/error surface to report it through instead.
        useWireDraftStore.getState().start(nodeId, handleId, handleType, origin, r);
        return;
      }

      dispatch(
        createConnectEdgeCommand(
          {
            source: sourceNodeId,
            sourceHandle: sourceHandleId,
            target: targetNodeId,
            targetHandle: targetHandleId,
          },
          draft.waypoints,
          busData,
        ),
      );
      useWireDraftStore.getState().clear();
    },
    [dispatch, screenToFlowPosition],
  );

  const onHandleMouseEnter = useCallback(
    (nodeId: string, handleType: "source" | "target", event: React.MouseEvent) => {
      const draft = useWireDraftStore.getState().draft;
      if (!draft) return;

      const compatible = draft.sourceHandleType !== handleType && draft.sourceNodeId !== nodeId;
      if (!compatible) return;

      const handleEl = event.currentTarget as HTMLElement;
      const point = getHandleCenter(handleEl, screenToFlowPosition);
      useWireDraftStore.getState().setSnapTarget(point);
    },
    [screenToFlowPosition],
  );

  const onHandleMouseLeave = useCallback(() => {
    useWireDraftStore.getState().setSnapTarget(null);
  }, []);

  return {onHandleClick, onHandleMouseEnter, onHandleMouseLeave};
}