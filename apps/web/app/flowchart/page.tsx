import type { Metadata } from "next";
import { FlowchartStudio } from "@/components/flowchart/studio";
import { BreadcrumbJsonLd, FaqJsonLd, SoftwareAppJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

const SEO_DESCRIPTION =
  "Free online flowchart maker for algorithms. Drag boxes where you want them, draw arrows between them, and let the automatic layout handle everything you have not placed by hand.";

/**
 * Questions people type into a search box, answered on the page and emitted as
 * FAQPage structured data. Carried over from the tool page this replaced, so
 * moving the maker to its own route does not throw the search surface away.
 */
const FAQ = [
  {
    question: "What do the different flowchart shapes mean?",
    answer:
      "A rounded pill is a terminal, meaning start or end. A rectangle is a process: a step that does something. A diamond is a decision, which asks a yes/no question and has one arrow leaving it per answer. A parallelogram is input or output. These shapes come from the ANSI and ISO 5807 flowchart conventions and are near-universal.",
  },
  {
    question: "How do you draw a loop in a flowchart?",
    answer:
      "A loop is an arrow that points back to an earlier box. There is no special symbol for it: a while loop is a decision box whose 'yes' branch runs the body and then returns to the decision, and whose 'no' branch continues past it. This tool draws those back edges dashed and routes them down the side so they do not cross the main flow.",
  },
  {
    question: "Can a flowchart show recursion?",
    answer:
      "Not directly. A flowchart describes one pass through a procedure, and recursion means the procedure invokes itself, which the notation has no symbol for. The usual convention is to draw a single call and show the recursive step as an ordinary process box, which is how the merge sort and quick sort templates here are drawn.",
  },
  {
    question: "Can I move the boxes myself?",
    answer:
      "Yes. Every box is placed automatically until you drag it, and from then on it stays exactly where you dropped it while the rest of the chart keeps arranging itself around it. Auto-layout releases every box at once, or a single box can be unpinned from its own panel, so a chart can never get stuck in a half-arranged state you cannot escape.",
  },
  {
    question: "Is my flowchart saved anywhere?",
    answer:
      "It is kept in your own browser as you work, so closing the tab does not lose it, but nothing is uploaded and there is no account. Use Copy JSON to take a chart with you, and Paste JSON to bring one back.",
  },
];

export const metadata: Metadata = buildContentMetadata({
  title: "Flowchart Maker",
  seoTitle: "Flowchart Maker: Build Algorithm Flowcharts Online, Free",
  seoDescription: SEO_DESCRIPTION,
  keywords: [
    "flowchart maker",
    "algorithm flowchart",
    "free flowchart tool",
    "flowchart generator online",
    "sorting algorithm flowchart",
    "bubble sort flowchart",
    "pseudocode flowchart",
  ],
  path: "/flowchart",
  type: "website",
});

/**
 * The flowchart maker, on its own route.
 *
 * A full-window editor, so the page itself is only the structured data and
 * the shell: everything a reader interacts with is client-side, and there is
 * nothing to scroll past to reach it. The prose that used to sit under the
 * widget on its tool page lives in the studio's help drawer instead, where it
 * is available without taking room from the canvas.
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
      <FlowchartStudio />
    </>
  );
}
