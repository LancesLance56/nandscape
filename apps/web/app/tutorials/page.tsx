import { redirect } from "next/navigation";
import { listTutorialNav } from "@/lib/tutorials/tutorials";

export const revalidate = 60;

export default async function TutorialsIndexPage() {
  const tree = await listTutorialNav();
  const first = tree.standalone[0] ?? tree.sections[0]?.pages[0];

  if (first) redirect(`/tutorials/${first.slug}`);

  return <p className="text-sm text-ink-soft">No tutorials published yet,  check back soon.</p>;
}