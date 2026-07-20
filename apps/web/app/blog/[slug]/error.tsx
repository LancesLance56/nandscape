"use client";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 pt-40 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Couldn't load the blog</h1>
      <p className="mt-2 text-sm text-ink-soft">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark"
      >
        Try again
      </button>
    </main>
  );
}