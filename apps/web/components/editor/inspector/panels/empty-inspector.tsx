export function EmptyInspectorPanel({message}: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className=" text-[11px] text-slate">
        Nothing selected
      </span>
      <p className="max-w-[18rem] text-sm text-ink-soft">
        {message ?? "Select a node or wire on the canvas to see and edit its properties here."}
      </p>
    </div>
  );
}
