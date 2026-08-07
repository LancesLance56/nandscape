import { getNodesBounds, getViewportForBounds, type ReactFlowInstance } from "@xyflow/react";
import { toPng } from "html-to-image";

const EXPORT_WIDTH = 1600;
const EXPORT_HEIGHT = 1000;
const EXPORT_PADDING = 0.15;

export async function exportCircuitImage(
  instance: Pick<ReactFlowInstance, "getNodes">,
  backgroundColor: string,
): Promise<string> {
  const nodes = instance.getNodes();
  if (nodes.length === 0) throw new Error("Nothing on the canvas to export");

  const bounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(bounds, EXPORT_WIDTH, EXPORT_HEIGHT, 0.1, 2, EXPORT_PADDING);

  const viewportEl = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewportEl) throw new Error("Circuit canvas isn't mounted");

  return toPng(viewportEl, {
    backgroundColor,
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    style: {
      width: `${EXPORT_WIDTH}px`,
      height: `${EXPORT_HEIGHT}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
