import type {ReactNode} from "react";

export function ToolbarGroup({children}: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      {children}
    </div>
  );
}