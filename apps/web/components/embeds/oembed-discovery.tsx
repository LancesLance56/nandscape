import { siteUrl } from "@/lib/site-url";

/**
 * The tag that turns a pasted link into the running tool.
 *
 * An oEmbed consumer such as WordPress, Ghost, Notion or Squarespace has no
 * idea Nandscape exists. It fetches the pasted URL, looks for exactly this
 * link element, then calls that endpoint and embeds whatever HTML comes back.
 * Without the tag it falls back to rendering a plain hyperlink, so this small
 * component decides whether a pasted link stays a link or becomes the tool.
 *
 * Emitted from the page body rather than through Next's metadata export,
 * because `alternates.types` does not cover the oEmbed link relation. React
 * hoists a <link> rendered here into <head>.
 */
export function OEmbedDiscovery({ path }: { path: string }) {
  const origin = siteUrl();
  const endpoint = `${origin}/api/oembed?url=${encodeURIComponent(`${origin}${path}`)}&format=json`;

  return <link rel="alternate" type="application/json+oembed" href={endpoint} />;
}
