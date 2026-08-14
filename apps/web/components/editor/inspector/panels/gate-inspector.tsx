"use client";

import {gateTypeToString, DEFAULT_GATE_DELAY} from "@nandscape/engine";
import {useEditorStore} from "@/store/editor-store";
import {useCommandDispatch} from "@/hooks/use-command";
import {commandRegistry} from "@/lib/commands/registry";
import {
  isVariableArityGate,
  defaultInputCountForGateType,
  hasSelectBits,
  hasCounterBits,
  clampSelectBits,
  clampCounterBits,
  DEFAULT_SELECT_BITS,
  DEFAULT_COUNTER_BITS,
  MIN_SELECT_BITS,
  MAX_SELECT_BITS,
  MIN_COUNTER_BITS,
  MAX_COUNTER_BITS,
} from "@/lib/editor/gate-defaults";
import type {EditorNode, GateNodeData} from "@/types/editor";

export function GateInspectorPanel({node}: { node: EditorNode }) {
  const data = node.data as GateNodeData;
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const dispatch = useCommandDispatch();
  const typeName = gateTypeToString(data.gateType);

  const handleRotate = () => {
    const command = commandRegistry.get("selection.rotate90");
    if (command) dispatch(command);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className=" text-[11px] text-slate">Gate</span>
        <span className="rounded-full bg-copper-bg px-2 py-0.5 text-[11px] font-semibold text-copper-dark">
          {typeName}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Label</span>
        <input
          type="text"
          value={data.label ?? ""}
          placeholder={typeName}
          onChange={(e) => updateNodeData(node.id, {label: e.target.value})}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
      </label>

      {isVariableArityGate(data.gateType) && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Input count</span>
          <input
            type="number"
            min={2}
            max={8}
            value={data.inputCount ?? defaultInputCountForGateType(data.gateType)}
            onChange={(e) => updateNodeData(node.id, {inputCount: Number(e.target.value)})}
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
          />
        </label>
      )}

      {hasSelectBits(data.gateType) && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Select bits</span>
          <input
            type="number"
            min={MIN_SELECT_BITS}
            max={MAX_SELECT_BITS}
            value={data.selectBits ?? DEFAULT_SELECT_BITS}
            onChange={(e) => updateNodeData(node.id, {selectBits: clampSelectBits(Number(e.target.value))})}
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
          />
          <span className="text-[11px] text-ink-soft">
            {1 << clampSelectBits(data.selectBits ?? DEFAULT_SELECT_BITS)} data lines.
          </span>
        </label>
      )}

      {hasCounterBits(data.gateType) && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Bit width</span>
          <input
            type="number"
            min={MIN_COUNTER_BITS}
            max={MAX_COUNTER_BITS}
            value={data.bitWidth ?? DEFAULT_COUNTER_BITS}
            onChange={(e) => updateNodeData(node.id, {bitWidth: clampCounterBits(Number(e.target.value))})}
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
          />
          <span className="text-[11px] text-ink-soft">
            Counts 0..{(1 << clampCounterBits(data.bitWidth ?? DEFAULT_COUNTER_BITS)) - 1} then wraps.
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">Delay (sim-time units)</span>
        <input
          type="number"
          min={1}
          placeholder={String(DEFAULT_GATE_DELAY[data.gateType])}
          value={data.delay ?? ""}
          onChange={(e) =>
            updateNodeData(node.id, {
              delay: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)),
            })
          }
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <span className="text-[11px] text-ink-soft">
          Empty uses this gate type&apos;s default ({DEFAULT_GATE_DELAY[data.gateType]}).
        </span>
      </label>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">Rotation</span>
        <button
          type="button"
          onClick={handleRotate}
          className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {data.rotation ?? 0}° ↻
        </button>
      </div>

      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft">Locked</span>
        <input
          type="checkbox"
          checked={data.locked ?? false}
          onChange={(e) => updateNodeData(node.id, {locked: e.target.checked})}
          className="h-4 w-4 accent-[var(--copper)]"
        />
      </label>
    </div>
  );
}