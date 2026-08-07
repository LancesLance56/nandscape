import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircuitEditor } from "@/components/editor";
import { getPuzzleBySlug } from "@/lib/puzzles/puzzles";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const puzzle = await getPuzzleBySlug(slug);
  if (!puzzle) return {};

  return {
    title: `${puzzle.title},  Nandscape`,
    description: puzzle.description,
  };
}

export default async function PuzzlePage({ params }: PageProps) {
  const { slug } = await params;
  const puzzle = await getPuzzleBySlug(slug);
  if (!puzzle) notFound();

  return <CircuitEditor puzzleSlug={slug} />;
}