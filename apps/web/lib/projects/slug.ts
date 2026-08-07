function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "circuit";
}

export function generateProjectSlug(name: string): string {
  return `${slugifyName(name)}-${crypto.randomUUID().slice(0, 8)}`;
}
