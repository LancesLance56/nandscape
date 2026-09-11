import { permanentRedirect } from "next/navigation";

/**
 * The embedding reference merged into /tools.
 *
 * Kept as a 308 rather than deleted: the old URL is in the sitemap, in the
 * navbar history of anyone who has been here, and quite possibly in somebody
 * else's page - the whole point of this section is that people link to it.
 */
export default function EmbedsPage() {
  permanentRedirect("/tools#embeds");
}
