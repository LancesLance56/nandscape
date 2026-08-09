import type { ComponentType } from "react";

import { PollWidget, isPollData } from "@/components/content/blocks/interactive/poll-widget";
import { QuizWidget, isQuizData } from "@/components/content/blocks/interactive/quiz-widget";
import { RevealWidget, isRevealData } from "@/components/content/blocks/interactive/reveal-widget";
import { TruthTableExplorerWidget } from "@/components/content/blocks/interactive/truth-table-explorer-widget";
import { ReorderWidget } from "@/components/content/blocks/interactive/reorder-widget";
import { ChoiceQuizWidget } from "@/components/content/blocks/interactive/choice-quiz-widget";
import { ComparisonSliderWidget } from "@/components/content/blocks/interactive/comparison-slider-widget";
import { KMapExplorerWidget } from "@/components/content/blocks/interactive/kmap-explorer-widget";
import { MintermPickerWidget } from "@/components/content/blocks/interactive/minterm-picker-widget";
import { GrayCodeExplorerWidget } from "@/components/content/blocks/interactive/gray-code-explorer-widget";
import { CircuitEmbedWidget, isCircuitEmbedData } from "@/components/content/blocks/circuit/circuit-embed";

import { RawJsonField } from "@/components/blog-editor/fields/raw-json-field";
import { PollWidgetEditor } from "@/components/blog-editor/widgets/poll-widget-editor";
import { QuizWidgetEditor } from "@/components/blog-editor/widgets/quiz-widget-editor";
import { RevealWidgetEditor } from "@/components/blog-editor/widgets/reveal-widget-editor";
import { CircuitEmbedWidgetEditor } from "@/components/blog-editor/widgets/circuit-embed-widget-editor";

export interface WidgetEditorProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

/**
 * Mirrors block-registry.tsx one level down, keyed by widget name instead of
 * block type - see interactive-block.tsx's own widgetRegistry.
 */
export interface WidgetDefinition {
  name: string;
  label: string;
  Renderer: ComponentType<{ data: Record<string, unknown> }>;
  Editor: ComponentType<WidgetEditorProps>;
  createDefault: () => Record<string, unknown>;
  /** Absent for widgets whose components already degrade gracefully with defaults instead of failing closed (see truth-table-explorer, kmap-explorer, minterm-picker, gray-code-explorer below) - inventing a stricter guard than the component itself enforces would just produce false-positive warnings. */
  validate?: (data: unknown) => string[];
}

function validateCircuitEmbed(data: unknown): string[] {
  return isCircuitEmbedData(data as Record<string, unknown>) ? [] : ["Needs `nodes` and `edges` arrays."];
}

const registryImpl: Record<string, WidgetDefinition> = {
  poll: {
    name: "poll",
    label: "Poll",
    Renderer: PollWidget,
    Editor: PollWidgetEditor,
    createDefault: () => ({ question: "", options: ["", ""] }),
    validate: (data) => (isPollData(data) ? [] : ["Needs a question and at least one option."]),
  },
  quiz: {
    name: "quiz",
    label: "Quiz",
    Renderer: QuizWidget,
    Editor: QuizWidgetEditor,
    createDefault: () => ({
      questions: [{ prompt: "", options: [{ label: "", correct: true }, { label: "", correct: false }] }],
    }),
    validate: (data) => (isQuizData(data) ? [] : ["Needs at least one question with options."]),
  },
  reveal: {
    name: "reveal",
    label: "Reveal",
    Renderer: RevealWidget,
    Editor: RevealWidgetEditor,
    createDefault: () => ({
      prompt: "",
      buttonLabel: "Reveal",
      afterLabel: "After",
      afterCode: "",
      explanation: "",
    }),
    validate: (data) => (isRevealData(data) ? [] : ["Needs a prompt, button label, after label/code, and explanation."]),
  },
  "truth-table-explorer": {
    name: "truth-table-explorer",
    label: "Truth Table Explorer",
    Renderer: TruthTableExplorerWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({ variables: ["A", "B", "C"], truthTable: Array(8).fill(0), title: "Truth Table Explorer" }),
  },
  reorder: {
    name: "reorder",
    label: "Reorder",
    Renderer: ReorderWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({
      items: [
        { id: "item-1", name: "Item 1", cost: 1 },
        { id: "item-2", name: "Item 2", cost: 2 },
      ],
      correctOrder: ["item-1", "item-2"],
    }),
  },
  "choice-quiz": {
    name: "choice-quiz",
    label: "Choice Quiz",
    Renderer: ChoiceQuizWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({
      prompt: "",
      options: [{ label: "", correct: true }, { label: "", correct: false }],
      verdictGood: "",
      explanation: "",
    }),
  },
  "comparison-slider": {
    name: "comparison-slider",
    label: "Comparison Slider",
    Renderer: ComparisonSliderWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({
      totalRequests: 100,
      initialPercent: 50,
      explanationTemplate: "{pct}% selected - {saved} left over.",
    }),
  },
  "kmap-explorer": {
    name: "kmap-explorer",
    label: "K-Map Explorer",
    Renderer: KMapExplorerWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({ variables: ["A", "B", "C"], truthTable: Array(8).fill(0), title: "Karnaugh Map" }),
  },
  "minterm-picker": {
    name: "minterm-picker",
    label: "Minterm Picker",
    Renderer: MintermPickerWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({ variables: ["A", "B"], truthTable: [0, 1, 1, 1] }),
  },
  "gray-code-explorer": {
    name: "gray-code-explorer",
    label: "Gray Code Explorer",
    Renderer: GrayCodeExplorerWidget,
    Editor: (props) => <RawJsonField {...props} />,
    createDefault: () => ({ bits: 3 }),
  },
  "circuit-embed": {
    name: "circuit-embed",
    label: "Circuit Embed",
    Renderer: CircuitEmbedWidget,
    Editor: CircuitEmbedWidgetEditor,
    createDefault: () => ({ nodes: [], edges: [] }),
    validate: validateCircuitEmbed,
  },
};

export const widgetRegistry: Record<string, WidgetDefinition> = registryImpl;

/**
 * Only canonical names - this is what "add a widget" and "switch widget
 * type" pick from. An author starting fresh should only ever see the
 * current name for a widget, never one of the retired ones below.
 */
export const widgetDefinitions: WidgetDefinition[] = Object.values(registryImpl);

/**
 * Old widget names that existing saved content may still use - mirrors
 * interactive-block.tsx's own alias map on the rendering side. Without
 * this, a block saved under one of these names looks unrecognized in the
 * editor (definition lookup fails, "Unknown widget") even though it
 * renders fine on the published page.
 */
const LEGACY_WIDGET_ALIASES: Record<string, string> = {
  "blackbox-explorer": "truth-table-explorer",
  "boolean-reorder": "reorder",
  "boolean-reveal": "reveal",
  "boolean-choice-quiz": "choice-quiz",
  "boolean-slider": "comparison-slider",
};

export function isLegacyWidgetName(name: string): boolean {
  return name in LEGACY_WIDGET_ALIASES;
}

export function getWidgetDefinition(name: string): WidgetDefinition | undefined {
  return registryImpl[name] ?? registryImpl[LEGACY_WIDGET_ALIASES[name]];
}
