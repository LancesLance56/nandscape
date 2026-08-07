"use client";

import { useState } from "react";
import { fieldInputClass } from "@/components/blog-editor/fields/field";

/**
 * Fallback editor for any widget without a typed one registered (see
 * widget-registry.tsx) - every widget is editable from day one this way,
 * typed editors get built incrementally for the ones authors reach for
 * most. Commits on blur rather than every keystroke, both so invalid
 * intermediate JSON (an unclosed brace mid-edit) never reaches `onChange`,
 * and to keep this consistent with every other field editor in this
 * directory, none of which commit on every keystroke either.
 */
export function RawJsonField({
  data,
  onChange,
  validate,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  validate?: (data: unknown) => string[];
}) {
  const [text, setText] = useState(() => JSON.stringify(data, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const commit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON.");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setParseError("Widget data must be a JSON object.");
      return;
    }
    setParseError(null);
    onChange(parsed as Record<string, unknown>);
  };

  // Validation is advisory, not a save-blocker (see block-card.tsx's issue
  // dot) - a parse error takes priority over it since there's nothing valid
  // to run the widget's own guard against yet.
  const issues = parseError ? [] : (validate?.(data) ?? []);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        spellCheck={false}
        className={`${fieldInputClass} resize-y font-mono text-xs`}
      />
      {parseError && <p className="text-xs text-signal-coral">Invalid JSON: {parseError}</p>}
      {!parseError && issues.length > 0 && (
        <ul className="list-inside list-disc text-xs text-signal-coral">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
