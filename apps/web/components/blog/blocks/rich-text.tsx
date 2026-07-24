import { Fragment } from "react";
import { safeHref } from "@/lib/blog/safe-href";
import type { TextMark, TextSpan } from "@/types/blog";

function applyMarks(text: string, marks: TextMark[] | undefined, key: string): React.ReactNode {
  if (!marks || marks.length === 0) return text;

  return marks.reduceRight<React.ReactNode>((node, mark, i) => {
    const markKey = `${key}-${i}`;
    switch (mark.kind) {
      case "bold":
        return <strong key={markKey}>{node}</strong>;
      case "italic":
        return <em key={markKey}>{node}</em>;
      case "code":
        return (
          <code key={markKey} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-copper-dark">
            {node}
          </code>
        );
      case "color":
        return (
          <span key={markKey} style={{ color: mark.value }}>
            {node}
          </span>
        );
      case "link":
        return (
          <a
            key={markKey}
            href={safeHref(mark.href)}
            className="font-medium text-copper underline decoration-copper/40 underline-offset-2 hover:text-copper-dark"
            target={mark.href.startsWith("/") ? undefined : "_blank"}
            rel={mark.href.startsWith("/") ? undefined : "noopener noreferrer"}
          >
            {node}
          </a>
        );
      default:
        return node;
    }
  }, text);
}

export function RichText({ spans }: { spans: TextSpan[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Fragment key={i}>{applyMarks(span.text, span.marks, `span-${i}`)}</Fragment>
      ))}
    </>
  );
}
