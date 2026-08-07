import { $getRoot, $createParagraphNode, $createTextNode, $isTextNode, $isElementNode, type EditorState, type TextNode } from "lexical";
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import type { TextSpan, TextMark } from "@/types/content-block";

/**
 * Builds a Lexical initial-state initializer from TextSpan[]. Bold/italic/
 * code map onto TextNode's built-in format bitmask via the public
 * toggleFormat() API (not raw bit values - those are private). Color maps
 * onto TextNode's built-in `style` string. Link wraps the TextNode in a
 * LinkNode. No custom Lexical node classes needed for any of the 5 marks.
 */
export function spansToEditorState(spans: TextSpan[]) {
  return () => {
    const root = $getRoot();
    root.clear();
    const paragraph = $createParagraphNode();
    const source = spans.length > 0 ? spans : [{ text: "" }];

    for (const span of source) {
      const marks = span.marks ?? [];
      const textNode = $createTextNode(span.text);

      for (const mark of marks) {
        if (mark.kind === "bold") textNode.toggleFormat("bold");
        if (mark.kind === "italic") textNode.toggleFormat("italic");
        if (mark.kind === "code") textNode.toggleFormat("code");
        if (mark.kind === "color") textNode.setStyle(`color: ${mark.value};`);
      }

      const linkMark = marks.find((mark): mark is Extract<TextMark, { kind: "link" }> => mark.kind === "link");
      if (linkMark) {
        const linkNode = $createLinkNode(linkMark.href);
        linkNode.append(textNode);
        paragraph.append(linkNode);
      } else {
        paragraph.append(textNode);
      }
    }

    root.append(paragraph);
  };
}

function marksFromTextNode(node: TextNode): TextMark[] {
  const marks: TextMark[] = [];
  if (node.hasFormat("bold")) marks.push({ kind: "bold" });
  if (node.hasFormat("italic")) marks.push({ kind: "italic" });
  if (node.hasFormat("code")) marks.push({ kind: "code" });

  const colorMatch = /color:\s*([^;]+)/.exec(node.getStyle());
  if (colorMatch) marks.push({ kind: "color", value: colorMatch[1].trim() });

  return marks;
}

/**
 * Reads only the editor's FIRST paragraph - SingleParagraphPlugin (see
 * rich-text-plugins.tsx) guarantees a second one is never created, since
 * TextSpan[] has no representation for one. If that invariant is ever
 * relaxed, this needs to walk every paragraph, not just the first.
 */
export function editorStateToSpans(editorState: EditorState): TextSpan[] {
  return editorState.read(() => {
    const root = $getRoot();
    const paragraph = root.getFirstChild();
    if (!paragraph || !$isElementNode(paragraph)) return [{ text: "" }];

    const spans: TextSpan[] = [];
    for (const node of paragraph.getChildren()) {
      if ($isLinkNode(node)) {
        const href = node.getURL();
        for (const child of node.getChildren()) {
          if ($isTextNode(child)) {
            const marks: TextMark[] = [...marksFromTextNode(child), { kind: "link", href }];
            spans.push({ text: child.getTextContent(), marks });
          }
        }
      } else if ($isTextNode(node)) {
        const marks = marksFromTextNode(node);
        spans.push({ text: node.getTextContent(), marks: marks.length > 0 ? marks : undefined });
      }
    }

    return spans.length > 0 ? spans : [{ text: "" }];
  });
}
