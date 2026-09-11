import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { NewDiscussionForm } from "@/components/community/new-discussion-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Start a Discussion",
  seoTitle: "Start a Discussion on Nandscape",
  seoDescription:
    "Open a discussion thread about algorithms, data structures, digital logic or anything else on Nandscape. Markdown, with a live preview.",
  path: "/community/discussions/new",
  type: "website",
});

export default async function NewDiscussionPage() {
  const user = await getCurrentUser().catch(() => null);
  // Signing in is the prerequisite, not an error state, so this sends people
  // where they need to go rather than rendering a form they cannot submit.
  if (!user) redirect("/login?next=/community/discussions/new");

  return (
    <CommunityShell
      active="discussions"
      eyebrow="New discussion"
      title="Start a Discussion"
      intro="Markdown, with a preview tab. Fenced code blocks, tables, lists and quotes all work."
    >
      {user.emailVerified ? (
        <NewDiscussionForm />
      ) : (
        <p className="max-w-2xl rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-ink-soft">
          Verify your email address before posting. Check your inbox, or{" "}
          <Link href="/account/settings" className="font-medium text-copper-dark hover:underline">
            resend the link
          </Link>
          .
        </p>
      )}
    </CommunityShell>
  );
}
