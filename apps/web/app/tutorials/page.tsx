import { redirect } from "next/navigation";
import { listTutorialNav } from "@/lib/tutorials/tutorials";
import type { TutorialNavTree } from "@/types/tutorial";

export const revalidate = 60;

export default async function TutorialsIndexPage() {
  // Defensive: this page has no dynamic segment, so Next tries to statically
  // render it at build time, when the DB may not be reachable yet (e.g.
  // building the Docker image before postgres is networked in).
  let tree: TutorialNavTree = { standalone: [], sections: [] };
  try {
    tree = await listTutorialNav();
  } catch {
    tree = { standalone: [], sections: [] };
  }
  const first = tree.standalone[0] ?? tree.sections[0]?.pages[0];

  if (first) redirect(`/tutorials/${first.slug}`);

  return <p className="text-sm text-ink-soft">No tutorials published yet,  check back soon.</p>;
}