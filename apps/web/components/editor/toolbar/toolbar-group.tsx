import type {ReactNode} from "react";

export function ToolbarGroup({children}: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-r border-border pr-2.5 last:border-r-0 last:pr-0">
      {children}
    </div>
  );
}
