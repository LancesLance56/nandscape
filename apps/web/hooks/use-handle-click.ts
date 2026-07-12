"use client";

import React, {useCallback} from "react";
import {useWireDraftStore} from "@/store/wire-draft-store";
import {useCommandDispatch} from "@/hooks/use-command";
import {useScreenToFlowPosition} from "@/hooks/use-flow-position";
import {createConnectEdgeCommand} from "@/lib/commands/commands/connect-edge.command";

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
      dispatch(
        createConnectEdgeCommand(
          {
            source: sourceIsDraft ? draft.sourceNodeId : nodeId,
            sourceHandle: sourceIsDraft ? draft.sourceHandleId : handleId,
            target: sourceIsDraft ? nodeId : draft.sourceNodeId,
            targetHandle: sourceIsDraft ? handleId : draft.sourceHandleId,
          },
          draft.waypoints,
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