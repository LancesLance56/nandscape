const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeHref(href: string | undefined | null): string {
  if (!href) return "#";
  const trimmed = href.trim();

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  try {
    const url = new URL(trimmed);
    return SAFE_PROTOCOLS.has(url.protocol) ? trimmed : "#";
  } catch {
    return "#";
  }
}
