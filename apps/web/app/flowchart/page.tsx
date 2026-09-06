import type { Metadata } from "next";
import { FlowchartEditor } from "@/components/flowchart-editor/editor";
import { BreadcrumbJsonLd, FaqJsonLd, SoftwareAppJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

const SEO_DESCRIPTION =
  "Free online flowchart maker. Draw every box where you want it and route every line by hand - click to start a connector, click to place each bend, click to land it. Nothing is auto-arranged.";

/**
 * Questions people type into a search box, answered on the page and emitted as
 * FAQPage structured data.
 */
const FAQ = [
  {
    question: "What do the different flowchart shapes mean?",
    answer:
      "A rounded pill is a terminator, meaning start or end. A rectangle is a process: a step that does something. A diamond is a decision, which asks a yes/no question and has one arrow leaving it per answer. A parallelogram is data going in or out. A rectangle with a bar down each side is a predefined process, meaning a sub-process defined elsewhere. These shapes come from the ANSI and ISO 5807 flowchart conventions and are near-universal.",
  },
  {
    question: "How do I draw a line between two shapes?",
    answer:
      "Hover a shape and connection dots appear around its edge. Drag from a dot to another shape and the two are connected. For a line that takes a specific path, pick the Line tool, click where it should start, click once at every corner you want it to turn, then click the shape it should end on. Every bend is placed by you and stays exactly where you put it.",
  },
  {
    question: "Does this tool re-route my connectors automatically?",
    answer:
      "No, and that is deliberate. A connector stores the exact polyline you drew. Moving a shape slides the attached end along with it and stretches the segments touching that end, but nothing recalculates the path, so a diagram you leave today opens tomorrow looking exactly the same.",
  },
  {
    question: "How do I change the path of a line I already drew?",
    answer:
      "Select it. A square handle appears at each end, a diamond at every bend, and a hollow circle in the middle of each segment. Drag a diamond to move one bend, drag a circle to slide a whole segment sideways, drag a square end onto a different shape to re-attach it, and double-click a diamond to remove that bend.",
  },
  {
    question: "How do I draw a loop in a flowchart?",
    answer:
      "A loop is a line that points back to an earlier shape. There is no special symbol for it: draw a connector out of the later shape, click a couple of times to take it around the outside of the diagram, and land it on the earlier one. Because nothing re-routes it, the corridor you route it down is the corridor it keeps.",
  },
  {
    question: "Is my flowchart saved anywhere?",
    answer:
      "It is kept in your own browser as you work, so closing the tab does not lose it, but nothing is uploaded and there is no account. Export to PNG or SVG to share it, or to JSON to keep a copy you can open again here.",
  },
];

export const metadata: Metadata = buildContentMetadata({
  title: "Flowchart Maker",
  seoTitle: "Flowchart Maker: Draw Flowcharts Online, Free",
  seoDescription: SEO_DESCRIPTION,
  keywords: [
    "flowchart maker",
    "flowchart software",
    "draw flowchart online",
    "free flowchart tool",
    "flowchart symbols",
    "diagram editor",
    "manual connector routing",
  ],
  path: "/flowchart",
  type: "website",
});

/**
 * The flowchart maker, on its own route.
 *
 * A full-window drawing tool, so the page itself is only the structured data
 * and the shell: everything a reader interacts with is client-side, and there
 * is nothing to scroll past to reach it.
 */
export default function FlowchartPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Tools", path: "/tools" },
          { name: "Flowchart Maker", path: "/flowchart" },
        ]}
      />
      <SoftwareAppJsonLd name="Flowchart Maker" description={SEO_DESCRIPTION} path="/flowchart" />
      <FaqJsonLd entries={FAQ} />
      <FlowchartEditor />
    </>
  );
}
