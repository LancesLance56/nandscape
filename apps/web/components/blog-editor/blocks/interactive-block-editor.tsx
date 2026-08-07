"use client";

import type { InteractiveBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { widgetDefinitions, getWidgetDefinition, isLegacyWidgetName } from "@/lib/blog-editor/widget-registry";

export function InteractiveBlockEditor({
  block,
  onChange,
}: {
  block: InteractiveBlock;
  onChange: (patch: Partial<Omit<InteractiveBlock, "id" | "type">>) => void;
}) {
  const definition = getWidgetDefinition(block.widget);
  const isLegacyName = isLegacyWidgetName(block.widget);

  return (
    <div className="flex flex-col gap-3">
      <Field label="Widget type">
        <select
          className={fieldInputClass}
          value={block.widget}
          onChange={(e) => {
            const next = getWidgetDefinition(e.target.value);
            if (next) onChange({ widget: next.name, data: next.createDefault() });
          }}
        >
          {!definition && (
            <option value={block.widget} disabled>
              {block.widget} (unknown)
            </option>
          )}
          {/* block.widget is a retired name (see LEGACY_WIDGET_ALIASES) that
              still resolves to a real widget - surface it as its own
              option so the <select> has something to match `value` against
              and shows what this block actually is, without silently
              renaming it until the author picks something themselves. */}
          {isLegacyName && definition && (
            <option value={block.widget}>
              {definition.label} (legacy name &ldquo;{block.widget}&rdquo;)
            </option>
          )}
          {widgetDefinitions.map((widget) => (
            <option key={widget.name} value={widget.name}>
              {widget.label}
            </option>
          ))}
        </select>
      </Field>

      {definition ? (
        // Remounts (and re-seeds any local field state) when the widget
        // identity changes, so switching types never shows stale editor
        // state for the previous widget's shape.
        <definition.Editor
          key={`${block.id}:${block.widget}`}
          data={block.data}
          onChange={(data) => onChange({ data })}
        />
      ) : (
        <p className="rounded-md border border-signal-coral/40 bg-signal-coral-bg px-3 py-2 text-xs text-signal-coral">
          Unknown widget &ldquo;{block.widget}&rdquo; - its data is preserved unchanged. Pick a widget type above to
          replace it, or edit the JSON directly once support for this widget is added.
        </p>
      )}
    </div>
  );
}
