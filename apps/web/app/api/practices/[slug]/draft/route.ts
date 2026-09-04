import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDraft, saveDraft } from "@/lib/practice/drafts";
import { practiceExists } from "@/lib/practice/practice-records";
import { isSupportedLanguage } from "@/lib/practice/languages";
import { listSubmissions } from "@/lib/practice/submissions";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * The reader's saved work for one problem, plus their submission history.
 *
 * Both are fetched together because the page needs both at the same moment and
 * neither is worth its own round trip.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    // Not an error: a signed-out reader simply has no saved work, and the page
    // should render the starter code rather than an error state.
    return NextResponse.json({ draft: null, submissions: [] });
  }

  const { slug } = await params;
  const language = request.nextUrl.searchParams.get("language");
  if (!isSupportedLanguage(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 422 });
  }

  const [draft, submissions] = await Promise.all([
    getDraft(user.id, slug, language),
    listSubmissions(user.id, slug),
  ]);

  return NextResponse.json({ draft, submissions });
}

/** Debounced autosave from the editor. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { language, code } = (body ?? {}) as { language?: unknown; code?: unknown };
  if (!isSupportedLanguage(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 422 });
  }
  if (typeof code !== "string") {
    return NextResponse.json({ error: "`code` must be a string" }, { status: 422 });
  }

  // Without this an authenticated caller can write a draft row for any slug it
  // invents, unbounded, because coding_drafts carries no foreign key.
  if (!(await practiceExists(slug))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await saveDraft(user.id, slug, language, code);
  return NextResponse.json({ draft });
}
