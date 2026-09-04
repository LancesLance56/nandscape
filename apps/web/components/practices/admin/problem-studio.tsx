"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUp, Check, Eye, Plus, Trash2, X } from "lucide-react";
import type {
  CompareMode,
  PracticeDifficulty,
  PracticeLanguage,
  PracticeTestCase,
  ValueType,
} from "@/types/practice";
import { checkProblem, countBy, type ProblemCheck } from "@/lib/practice/validate";
import { formatValue } from "@/lib/practice/compare";
import { CodeField } from "./code-field";
import { TableFrame, TableScroll, tableClasses } from "@/components/ui/table-frame";
import "./problem-studio.css";

/**
 * Problem Studio - the admin editor for a coding problem.
 *
 * Laid out from the Claude Design "Problem Studio" page and styled with the
 * "Classical" design system it was drawn in, scoped to this route (see
 * problem-studio.css for why the tokens are not global).
 *
 * Where the design showed a field this app has no column for - audience,
 * revision history, per-language time multipliers, translation counts - the
 * slot carries the real equivalent instead of a control that does nothing.
 * The Checks rail is the clearest case: in the design it is four illustrative
 * lines, and here it runs the actual server-side validation rules from
 * lib/practice/validate.ts, so a green rail means the save will be accepted
 * rather than merely looking tidy.
 */

export interface StudioDraft {
  slug: string;
  title: string;
  summary: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  statement: string;
  signature: { name: string; params: { name: string; type: ValueType }[]; returns: ValueType };
  languages: PracticeLanguage[];
  starterCode: Record<string, string>;
  visibleTests: PracticeTestCase[];
  hiddenTests: PracticeTestCase[];
  solutions: Record<string, string>;
  compareMode: CompareMode;
  epsilon: number;
  timeLimitMs: number;
  memoryLimitMb: number;
}

interface ProblemStudioProps {
  initial: StudioDraft;
  /** False for /admin/practices/new, which POSTs instead of PUTs. */
  exists: boolean;
  /** Languages with a real driver. `cpp` is declared but not yet runnable. */
  runnableLanguages: PracticeLanguage[];
}

const DIFFICULTIES: PracticeDifficulty[] = ["easy", "medium", "hard", "expert"];
const ALL_LANGUAGES: PracticeLanguage[] = ["python", "javascript", "cpp"];
const LANGUAGE_LABELS: Record<PracticeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
};
const VALUE_TYPES: ValueType[] = [
  "int",
  "float",
  "bool",
  "string",
  "int[]",
  "float[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
  "void",
];
const COMPARE_MODES: { key: CompareMode; label: string; hint: string }[] = [
  { key: "exact", label: "Exact", hint: "Values must match element for element." },
  { key: "unordered", label: "Unordered", hint: "Same items at the top level, any order." },
  { key: "float", label: "Float", hint: "Numbers within epsilon of each other." },
];

const SECTIONS = [
  { id: "identity", label: "Identity & taxonomy" },
  { id: "signature", label: "Signature" },
  { id: "statement", label: "Statement" },
  { id: "tests", label: "Test cases" },
  { id: "starter", label: "Starter code" },
  { id: "solution", label: "Reference solution" },
  { id: "judge", label: "Judge & limits" },
];

type CaseKind = "sample" | "hidden";

export function ProblemStudio({ initial, exists, runnableLanguages }: ProblemStudioProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<StudioDraft>(initial);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<PracticeLanguage>(
    initial.languages[0] ?? "python",
  );
  const [editingCase, setEditingCase] = useState<{ kind: CaseKind; index: number } | null>(null);

  const patch = useCallback((next: Partial<StudioDraft>) => {
    setDirty(true);
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  const checks = useMemo(() => checkProblem(draft), [draft]);
  const errorCount = countBy(checks, "error");
  const warningCount = countBy(checks, "warning");

  const save = useCallback(async () => {
    if (errorCount > 0) {
      setNotice({ tone: "bad", text: "Fix the blocking checks before saving." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(
        exists ? `/api/practices/${initial.slug}` : "/api/practices",
        {
          method: exists ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setNotice({ tone: "bad", text: payload?.error ?? "Save failed." });
        return;
      }
      setDirty(false);
      setSavedAt(new Date());
      setNotice({ tone: "ok", text: "Saved." });
      if (!exists) router.replace(`/admin/practices/${draft.slug}`);
      else router.refresh();
    } catch {
      setNotice({ tone: "bad", text: "Could not reach the server." });
    } finally {
      setSaving(false);
    }
  }, [draft, errorCount, exists, initial.slug, router]);

  const rows = useMemo(
    () => [
      ...draft.visibleTests.map((testCase, index) => ({ testCase, kind: "sample" as const, index })),
      ...draft.hiddenTests.map((testCase, index) => ({ testCase, kind: "hidden" as const, index })),
    ],
    [draft.visibleTests, draft.hiddenTests],
  );

  const updateCase = useCallback(
    (kind: CaseKind, index: number, next: PracticeTestCase | null) => {
      setDirty(true);
      setDraft((current) => {
        const key = kind === "sample" ? "visibleTests" : "hiddenTests";
        const list = [...current[key]];
        if (next === null) list.splice(index, 1);
        else list[index] = next;
        return { ...current, [key]: list };
      });
    },
    [],
  );

  const moveCase = useCallback((kind: CaseKind, index: number) => {
    setDirty(true);
    setDraft((current) => {
      const fromKey = kind === "sample" ? "visibleTests" : "hiddenTests";
      const toKey = kind === "sample" ? "hiddenTests" : "visibleTests";
      const from = [...current[fromKey]];
      const [moved] = from.splice(index, 1);
      if (!moved) return current;
      return { ...current, [fromKey]: from, [toKey]: [...current[toKey], moved] };
    });
    setEditingCase(null);
  }, []);

  const addCase = useCallback(
    (kind: CaseKind) => {
      const blank: PracticeTestCase = {
        args: draft.signature.params.map(() => null),
        expected: null,
      };
      setDirty(true);
      setDraft((current) => {
        const key = kind === "sample" ? "visibleTests" : "hiddenTests";
        return { ...current, [key]: [...current[key], blank] };
      });
      setEditingCase({
        kind,
        index: kind === "sample" ? draft.visibleTests.length : draft.hiddenTests.length,
      });
    },
    [draft.signature.params, draft.visibleTests.length, draft.hiddenTests.length],
  );

  return (
    <div className="studio studio-shell">
      <StudioHeader
        draft={draft}
        exists={exists}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        blocked={errorCount > 0}
        onSave={save}
      />

      {notice && (
        <div
          style={{
            padding: "8px 32px",
            fontSize: 13,
            borderBottom: "1px solid var(--color-divider)",
            color: notice.tone === "ok" ? "var(--color-ok)" : "var(--color-danger)",
            background: notice.tone === "ok" ? "var(--color-ok-bg)" : "var(--color-danger-bg)",
          }}
        >
          {notice.text}
        </div>
      )}

      {(errorCount > 0 || warningCount > 0) && (
        <ValidationBanner checks={checks} errorCount={errorCount} warningCount={warningCount} />
      )}

      <div className="studio-grid">
        <ContentsRail />

        <main
          style={{
            padding: "40px 44px 96px",
            display: "flex",
            flexDirection: "column",
            gap: 44,
            minWidth: 0,
          }}
        >
          <IdentitySection draft={draft} patch={patch} exists={exists} />
          <SignatureSection draft={draft} patch={patch} />
          <StatementSection
            statement={draft.statement}
            onChange={(text) => patch({ statement: text })}
          />
          <TestCasesSection
            draft={draft}
            rows={rows}
            editing={editingCase}
            onEdit={setEditingCase}
            onUpdate={updateCase}
            onMove={moveCase}
            onAdd={addCase}
          />
          <StarterSection
            draft={draft}
            patch={patch}
            active={activeLanguage}
            setActive={setActiveLanguage}
            runnable={runnableLanguages}
            field="starterCode"
            number="05"
            id="starter"
            title="Starter code"
          />
          <StarterSection
            draft={draft}
            patch={patch}
            active={activeLanguage}
            setActive={setActiveLanguage}
            runnable={runnableLanguages}
            field="solutions"
            number="06"
            id="solution"
            title="Reference solution"
          />
          <JudgeSection draft={draft} patch={patch} />
        </main>

        <StatusRail draft={draft} checks={checks} exists={exists} />
      </div>
    </div>
  );
}

/* ── header ─────────────────────────────────────────────────────────────── */

function StudioHeader({
  draft,
  exists,
  dirty,
  saving,
  savedAt,
  blocked,
  onSave,
}: {
  draft: StudioDraft;
  exists: boolean;
  dirty: boolean;
  saving: boolean;
  savedAt: Date | null;
  blocked: boolean;
  onSave: () => void;
}) {
  return (
    <header
      className="nav"
      style={{
        padding: "14px 32px",
        gap: 20,
        position: "sticky",
        top: 0,
        background: "var(--color-bg)",
        zIndex: 5,
      }}
    >
      <span className="nav-brand" style={{ marginRight: 0 }}>
        Problem Studio
      </span>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          marginRight: "auto",
          color: "var(--color-text-soft)",
        }}
      >
        <Link href="/admin/practices">Catalogue</Link>
        <span>/</span>
        <span className="mono" style={{ color: "var(--color-text)" }}>
          {draft.slug || "untitled"}
        </span>
      </nav>

      {/* The design showed "Saved 4 minutes ago · rev 7". There is no revision
          table behind this, so the slot reports the one thing that is real -
          whether what is on screen has reached the database. */}
      <span
        style={{
          fontSize: 12,
          color: dirty
            ? "var(--color-accent-strong)"
            : "var(--color-text-soft)",
        }}
      >
        {dirty
          ? "Unsaved changes"
          : savedAt
            ? `Saved at ${savedAt.toLocaleTimeString()}`
            : exists
              ? "No changes"
              : "New problem"}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {exists && (
          <Link
            href={`/practices/${draft.slug}`}
            target="_blank"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            <Eye size={14} />
            Preview as candidate
          </Link>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={saving || blocked || (!dirty && exists)}
        >
          <ArrowUp size={14} />
          {saving ? "Saving..." : exists ? "Save changes" : "Create problem"}
        </button>
      </div>
    </header>
  );
}

function ValidationBanner({
  checks,
  errorCount,
  warningCount,
}: {
  checks: ProblemCheck[];
  errorCount: number;
  warningCount: number;
}) {
  const headline =
    errorCount > 0
      ? `${errorCount} check${errorCount === 1 ? "" : "s"} must pass before this can be saved.`
      : `${warningCount} advisory check${warningCount === 1 ? "" : "s"}.`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "10px 32px",
        borderBottom: "1px solid var(--color-divider)",
        background: "var(--color-accent-100)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--color-accent-strong)",
          flex: "none",
        }}
      >
        <AlertTriangle size={15} />
        {headline}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--color-accent-strong)",
          opacity: 0.85,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {checks
          .slice(0, 2)
          .map((check) => check.message)
          .join(" · ")}
      </span>
      <a href="#checks" style={{ fontSize: 13, marginLeft: "auto", flex: "none" }}>
        See all {checks.length} checks
      </a>
    </div>
  );
}

/* ── rails ──────────────────────────────────────────────────────────────── */

function ContentsRail() {
  return (
    <aside
      style={{ position: "sticky", top: 66, padding: "32px 32px 40px" }}
    >
      <h6 style={{ margin: "0 0 14px", color: "var(--color-text-soft)" }}>
        Contents
      </h6>
      <ol className="studio-contents" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {SECTIONS.map((section, index) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>
              <span className="mono num">{String(index + 1).padStart(2, "0")}</span>
              <span>{section.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function StatusRail({
  draft,
  checks,
  exists,
}: {
  draft: StudioDraft;
  checks: ProblemCheck[];
  exists: boolean;
}) {
  const passing = checks.length === 0;

  return (
    <aside
      style={{
        position: "sticky",
        top: 66,
        padding: "40px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      <div>
        <h6 style={{ margin: "0 0 12px", color: "var(--color-text-soft)" }}>
          Visibility
        </h6>
        {/* The design had a Draft/Review/Live control. CodingProblem has no
            status column, and a three-state switch that silently does nothing
            would be worse than saying so plainly. */}
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
          {exists
            ? "Live in the catalogue as soon as it is saved. There is no draft state yet."
            : "Not created yet. Saving publishes it to the catalogue immediately."}
        </p>
      </div>

      <div id="checks">
        <h6 style={{ margin: "0 0 12px", color: "var(--color-text-soft)" }}>
          Checks
        </h6>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13 }}>
          {passing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={14} style={{ color: "var(--color-accent)", flex: "none" }} />
              <span>Every check passes</span>
            </div>
          )}
          {checks.map((check) => (
            <div key={check.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertTriangle
                size={14}
                style={{
                  color:
                    check.level === "error" ? "var(--color-danger)" : "var(--color-accent-strong)",
                  flex: "none",
                  marginTop: 2,
                }}
              />
              {check.section ? (
                <a href={`#${check.section}`} style={{ color: "inherit" }}>
                  {check.message}
                </a>
              ) : (
                <span>{check.message}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h6 style={{ margin: "0 0 12px", color: "var(--color-text-soft)" }}>
          Shape
        </h6>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr auto", gap: "7px 10px", fontSize: 13 }}>
          <dt style={{ opacity: 0.7 }}>Example cases</dt>
          <dd className="mono" style={{ margin: 0 }}>{draft.visibleTests.length}</dd>
          <dt style={{ opacity: 0.7 }}>Hidden cases</dt>
          <dd className="mono" style={{ margin: 0 }}>{draft.hiddenTests.length}</dd>
          <dt style={{ opacity: 0.7 }}>Languages</dt>
          <dd className="mono" style={{ margin: 0 }}>{draft.languages.length}</dd>
          <dt style={{ opacity: 0.7 }}>Statement words</dt>
          <dd className="mono" style={{ margin: 0 }}>
            {draft.statement.trim() ? draft.statement.trim().split(/\s+/).length : 0}
          </dd>
        </dl>
      </div>
    </aside>
  );
}

/* ── sections ───────────────────────────────────────────────────────────── */

function SectionHead({
  number,
  id,
  title,
  aside,
}: {
  number: string;
  id: string;
  title: string;
  aside?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 22 }} id={id}>
      <span className="mono" style={{ fontSize: 12, color: "var(--color-accent)" }}>
        {number}
      </span>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {aside && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--color-text-soft)",
          }}
        >
          {aside}
        </span>
      )}
    </div>
  );
}

function IdentitySection({
  draft,
  patch,
  exists,
}: {
  draft: StudioDraft;
  patch: (next: Partial<StudioDraft>) => void;
  exists: boolean;
}) {
  const [tagDraft, setTagDraft] = useState("");

  return (
    <section>
      <SectionHead number="01" id="identity" title="Identity & taxonomy" aside="Slug addresses the problem everywhere" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" }}>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label htmlFor="f-title">Title</label>
          <input
            id="f-title"
            className="input"
            type="text"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            style={{ fontSize: 16, fontWeight: 600, minHeight: 42 }}
          />
        </div>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label htmlFor="f-summary">Summary</label>
          <input
            id="f-summary"
            className="input"
            type="text"
            value={draft.summary}
            onChange={(event) => patch({ summary: event.target.value })}
            placeholder="One line for the catalogue row"
          />
        </div>
        <div className="field">
          <label htmlFor="f-slug">Slug</label>
          {/* Fixed once the problem exists: the API rejects a change, because
              the slug is the public URL and coding_drafts is keyed by it. */}
          <input
            id="f-slug"
            className="input mono"
            type="text"
            value={draft.slug}
            disabled={exists}
            title={exists ? "The slug is fixed once the problem exists" : undefined}
            onChange={(event) => patch({ slug: event.target.value })}
          />
        </div>
        <div className="field">
          <label>Difficulty</label>
          <div className="seg">
            {DIFFICULTIES.map((level) => (
              <label key={level} className="seg-opt">
                <input
                  type="radio"
                  name="difficulty"
                  checked={draft.difficulty === level}
                  onChange={() => patch({ difficulty: level })}
                />
                <span>{level[0].toUpperCase() + level.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label>Topic tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, paddingTop: 4 }}>
            {draft.tags.map((tag) => (
              <span key={tag} className="tag tag-accent" style={{ gap: 6 }}>
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => patch({ tags: draft.tags.filter((item) => item !== tag) })}
                  style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", display: "flex" }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              className="input mono"
              style={{ width: 150, minHeight: 28, fontSize: 12 }}
              value={tagDraft}
              placeholder="add tag"
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const tag = tagDraft.trim();
                if (tag && !draft.tags.includes(tag)) patch({ tags: [...draft.tags, tag] });
                setTagDraft("");
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SignatureSection({
  draft,
  patch,
}: {
  draft: StudioDraft;
  patch: (next: Partial<StudioDraft>) => void;
}) {
  const { signature } = draft;

  const setParam = (index: number, next: Partial<{ name: string; type: ValueType }>) => {
    const params = signature.params.map((param, i) => (i === index ? { ...param, ...next } : param));
    patch({ signature: { ...signature, params } });
  };

  return (
    <section>
      <SectionHead
        number="02"
        id="signature"
        title="Signature"
        aside="Drivers are generated from this"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px", marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="f-fn">Function name</label>
          <input
            id="f-fn"
            className="input mono"
            type="text"
            value={signature.name}
            onChange={(event) => patch({ signature: { ...signature, name: event.target.value } })}
          />
        </div>
        <div className="field">
          <label htmlFor="f-returns">Returns</label>
          <select
            id="f-returns"
            className="input mono"
            value={signature.returns}
            onChange={(event) =>
              patch({ signature: { ...signature, returns: event.target.value as ValueType } })
            }
          >
            {VALUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TableFrame>
        <TableScroll>
        <table className={tableClasses.table}>
        <thead>
          <tr className={tableClasses.headRow}>
            <th className={tableClasses.th} style={{ width: 52 }}>#</th>
            <th className={tableClasses.th}>Parameter</th>
            <th className={tableClasses.th} style={{ width: 180 }}>Type</th>
            <th className={tableClasses.th} style={{ width: 56 }} />
          </tr>
        </thead>
        <tbody>
          {signature.params.map((param, index) => (
            <tr key={index} className={tableClasses.row}>
              <td className={`mono ${tableClasses.td}`} style={{ color: "var(--color-text-soft)", fontSize: 12 }}>
                {String(index + 1).padStart(2, "0")}
              </td>
              <td className={tableClasses.td}>
                <input
                  className="input mono"
                  value={param.name}
                  onChange={(event) => setParam(index, { name: event.target.value })}
                />
              </td>
              <td className={tableClasses.td}>
                <select
                  className="input mono"
                  value={param.type}
                  onChange={(event) => setParam(index, { type: event.target.value as ValueType })}
                >
                  {VALUE_TYPES.filter((type) => type !== "void").map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </td>
              <td className={tableClasses.td}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() =>
                    patch({
                      signature: {
                        ...signature,
                        params: signature.params.filter((_, i) => i !== index),
                      },
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
        </TableScroll>
      </TableFrame>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 13 }}
          onClick={() =>
            patch({
              signature: {
                ...signature,
                params: [...signature.params, { name: `arg${signature.params.length + 1}`, type: "int" }],
              },
            })
          }
        >
          <Plus size={14} />
          Add parameter
        </button>
        <span
          className="mono"
          style={{ marginLeft: "auto", fontSize: 12.5, opacity: 0.7 }}
        >
          {signature.name}({signature.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) →{" "}
          {signature.returns}
        </span>
      </div>
    </section>
  );
}

function StatementSection({
  statement,
  onChange,
}: {
  statement: string;
  onChange: (text: string) => void;
}) {
  const words = statement.trim() ? statement.trim().split(/\s+/).length : 0;

  return (
    <section>
      <SectionHead
        number="03"
        id="statement"
        title="Statement"
        aside="Markdown — headings and constraints are yours to shape"
      />
      <div className="studio-panel">
        <div className="studio-panel-head">
          <span className="mono">statement.md</span>
          <span>Markdown · GFM tables · fenced code</span>
          <span style={{ marginLeft: "auto" }}>
            {words} word{words === 1 ? "" : "s"}
          </span>
        </div>
        {/* The same highlighted field the code sections use, in Markdown mode:
            headings, emphasis and fences colour as you type. */}
        <CodeField value={statement} language="markdown" minRows={18} onChange={onChange} />
      </div>
    </section>
  );
}

function TestCasesSection({
  draft,
  rows,
  editing,
  onEdit,
  onUpdate,
  onMove,
  onAdd,
}: {
  draft: StudioDraft;
  rows: { testCase: PracticeTestCase; kind: CaseKind; index: number }[];
  editing: { kind: CaseKind; index: number } | null;
  onEdit: (next: { kind: CaseKind; index: number } | null) => void;
  onUpdate: (kind: CaseKind, index: number, next: PracticeTestCase | null) => void;
  onMove: (kind: CaseKind, index: number) => void;
  onAdd: (kind: CaseKind) => void;
}) {
  const incomplete = rows.filter((row) => row.testCase.expected === undefined).length;

  return (
    <section>
      <SectionHead
        number="04"
        id="tests"
        title="Test cases"
        aside={`${draft.visibleTests.length} example · ${draft.hiddenTests.length} hidden${
          incomplete ? ` · ${incomplete} incomplete` : ""
        }`}
      />
      <TableFrame>
        <TableScroll>
        <table className={tableClasses.table}>
        <thead>
          <tr className={tableClasses.headRow}>
            <th className={tableClasses.th} style={{ width: 52 }}>#</th>
            <th className={tableClasses.th} style={{ width: 92 }}>Kind</th>
            <th className={tableClasses.th}>Input</th>
            <th className={tableClasses.th} style={{ width: 132 }}>Expected</th>
            <th className={tableClasses.th} style={{ width: 180 }}>Note</th>
            <th className={tableClasses.th} style={{ width: 96 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEditing =
              editing?.kind === row.kind && editing.index === row.index;
            return isEditing ? (
              <CaseEditorRow
                key={`${row.kind}-${row.index}`}
                draft={draft}
                row={row}
                onUpdate={onUpdate}
                onMove={onMove}
                onDone={() => onEdit(null)}
              />
            ) : (
              <tr key={`${row.kind}-${row.index}`} className={tableClasses.row}>
                <td className={`mono ${tableClasses.td}`} style={{ color: "var(--color-text-soft)", fontSize: 12 }}>
                  {String(row.index + 1).padStart(2, "0")}
                </td>
                <td className={tableClasses.td}>
                  <span className={row.kind === "sample" ? "tag tag-outline" : "tag tag-neutral"}>
                    {row.kind === "sample" ? "Sample" : "Hidden"}
                  </span>
                </td>
                <td className={`mono ${tableClasses.td}`} style={{ fontSize: 12.5 }}>
                  {draft.signature.params
                    .map((param, i) => `${param.name} = ${formatValue(row.testCase.args?.[i])}`)
                    .join(", ")}
                </td>
                <td className={`mono ${tableClasses.td}`} style={{ fontSize: 12.5 }}>
                  {row.testCase.expected === undefined ? (
                    <span
                      style={{
                        color: "var(--color-accent-strong)",
                        borderBottom: "1px solid var(--color-accent)",
                      }}
                    >
                      missing
                    </span>
                  ) : (
                    formatValue(row.testCase.expected)
                  )}
                </td>
                <td className={tableClasses.td} style={{ fontSize: 13, opacity: 0.7 }}>{row.testCase.explanation ?? ""}</td>
                <td className={tableClasses.td}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => onEdit({ kind: row.kind, index: row.index })}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
        </TableScroll>
      </TableFrame>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => onAdd("sample")}>
          <Plus size={14} />
          Add example
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => onAdd("hidden")}>
          <Plus size={14} />
          Add hidden case
        </button>
      </div>
    </section>
  );
}

function CaseEditorRow({
  draft,
  row,
  onUpdate,
  onMove,
  onDone,
}: {
  draft: StudioDraft;
  row: { testCase: PracticeTestCase; kind: CaseKind; index: number };
  onUpdate: (kind: CaseKind, index: number, next: PracticeTestCase | null) => void;
  onMove: (kind: CaseKind, index: number) => void;
  onDone: () => void;
}) {
  const [argsText, setArgsText] = useState(() => JSON.stringify(row.testCase.args ?? []));
  const [expectedText, setExpectedText] = useState(() =>
    row.testCase.expected === undefined ? "" : JSON.stringify(row.testCase.expected),
  );
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    let args: unknown[];
    try {
      args = JSON.parse(argsText);
      if (!Array.isArray(args)) throw new Error("Arguments must be a JSON array");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid arguments");
      return;
    }
    if (args.length !== draft.signature.params.length) {
      setError(`Expected ${draft.signature.params.length} argument(s), got ${args.length}`);
      return;
    }
    let expected: unknown;
    try {
      expected = expectedText.trim() === "" ? undefined : JSON.parse(expectedText);
    } catch {
      setError("Expected value is not valid JSON");
      return;
    }
    onUpdate(row.kind, row.index, { ...row.testCase, args, expected });
    onDone();
  };

  return (
    <tr>
      <td colSpan={6} className={tableClasses.td} style={{ background: "var(--surface-2)" }}>
        <div style={{ display: "grid", gap: 12, padding: "6px 2px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12 }}>
            <div className="field">
              <label>Arguments — JSON array, one entry per parameter</label>
              <input
                className="input mono"
                value={argsText}
                onChange={(event) => setArgsText(event.target.value)}
              />
              <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>
                {draft.signature.params.map((p) => `${p.name}: ${p.type}`).join(", ") || "no parameters"}
              </span>
            </div>
            <div className="field">
              <label>Expected — JSON value</label>
              <input
                className="input mono"
                value={expectedText}
                placeholder="leave blank for missing"
                onChange={(event) => setExpectedText(event.target.value)}
              />
              <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>
                returns {draft.signature.returns}
              </span>
            </div>
          </div>
          <div className="field">
            <label>Note — shown under the example in the statement</label>
            <input
              className="input"
              value={row.testCase.explanation ?? ""}
              onChange={(event) =>
                onUpdate(row.kind, row.index, {
                  ...row.testCase,
                  explanation: event.target.value || undefined,
                })
              }
            />
          </div>
          {error && <span style={{ fontSize: 13, color: "var(--color-danger)" }}>{error}</span>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={commit}>
              Apply
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={onDone}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => onMove(row.kind, row.index)}
            >
              Make {row.kind === "sample" ? "hidden" : "an example"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 13, marginLeft: "auto" }}
              onClick={() => {
                onUpdate(row.kind, row.index, null);
                onDone();
              }}
            >
              <Trash2 size={13} />
              Delete case
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/**
 * Serves both the starter-code and reference-solution sections: they are the
 * same control over a different column, and the design drew them as one
 * pattern (a language switch above a code panel).
 */
function StarterSection({
  draft,
  patch,
  active,
  setActive,
  runnable,
  field,
  number,
  id,
  title,
}: {
  draft: StudioDraft;
  patch: (next: Partial<StudioDraft>) => void;
  active: PracticeLanguage;
  setActive: (language: PracticeLanguage) => void;
  runnable: PracticeLanguage[];
  field: "starterCode" | "solutions";
  number: string;
  id: string;
  title: string;
}) {
  const value = draft[field][active] ?? "";
  const extension = active === "python" ? "py" : active === "javascript" ? "js" : "cpp";

  return (
    <section>
      <SectionHead
        number={number}
        id={id}
        title={title}
        aside={field === "solutions" ? "Never sent to the client" : "Signatures follow section 02"}
      />

      {field === "starterCode" && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-soft)" }}>
            Enabled languages
          </span>
          {ALL_LANGUAGES.map((language) => {
            const supported = runnable.includes(language);
            const enabled = draft.languages.includes(language);
            return (
              <label key={language} className="radio" style={{ opacity: supported ? 1 : 0.45 }}>
                <input
                  type="checkbox"
                  disabled={!supported}
                  checked={enabled}
                  onChange={() =>
                    patch({
                      languages: enabled
                        ? draft.languages.filter((item) => item !== language)
                        : [...draft.languages, language],
                    })
                  }
                />
                <span className="dot" />
                <span>
                  {LANGUAGE_LABELS[language]}
                  {!supported && " — no driver yet"}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="seg" style={{ marginBottom: 14 }}>
        {ALL_LANGUAGES.filter((language) => runnable.includes(language)).map((language) => (
          <label key={language} className="seg-opt">
            <input
              type="radio"
              name={`lang-${field}`}
              checked={active === language}
              onChange={() => setActive(language)}
            />
            <span>{LANGUAGE_LABELS[language]}</span>
          </label>
        ))}
      </div>

      <div className="studio-panel">
        <div className="studio-panel-head">
          <span className="mono" style={{ opacity: 0.6 }}>
            {field === "solutions" ? "reference" : "solution"}.{extension}
          </span>
          <span style={{ color: "var(--color-text-soft)" }}>
            {draft.signature.name}({draft.signature.params.map((p) => p.name).join(", ")})
          </span>
          <span style={{ marginLeft: "auto", color: "var(--color-text-soft)" }}>
            {draft.languages.includes(active) ? "Enabled" : "Language not enabled"}
          </span>
        </div>
        <CodeField
          value={value}
          language={active}
          minRows={12}
          onChange={(next) => patch({ [field]: { ...draft[field], [active]: next } })}
        />
      </div>
    </section>
  );
}

function JudgeSection({
  draft,
  patch,
}: {
  draft: StudioDraft;
  patch: (next: Partial<StudioDraft>) => void;
}) {
  // Mirrors buildLimits() in lib/practice/limits.ts: every case travels in one
  // batch, so the engine's budget is per-case time times the case count.
  const caseCount = draft.visibleTests.length + draft.hiddenTests.length;
  const batchMs = Math.min(15_000, draft.timeLimitMs * Math.max(1, caseCount) + 1_000);

  return (
    <section>
      <SectionHead number="07" id="judge" title="Judge & limits" aside="Clamped server-side on every run" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px 24px", marginBottom: 26 }}>
        <div className="field">
          <label htmlFor="f-time-limit">Time limit per case (ms)</label>
          <input
            id="f-time-limit"
            className="input mono"
            type="number"
            min={250}
            max={5000}
            value={draft.timeLimitMs}
            onChange={(event) => patch({ timeLimitMs: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="f-memory">Memory limit (MB)</label>
          <input
            id="f-memory"
            className="input mono"
            type="number"
            min={32}
            max={256}
            value={draft.memoryLimitMb}
            onChange={(event) => patch({ memoryLimitMb: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="f-epsilon">Epsilon (float compare)</label>
          <input
            id="f-epsilon"
            className="input mono"
            type="text"
            value={draft.epsilon}
            disabled={draft.compareMode !== "float"}
            onChange={(event) => patch({ epsilon: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 22 }}>
        <label>Comparison</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {COMPARE_MODES.map((mode) => (
            <label key={mode.key} className="radio">
              <input
                type="radio"
                name="compare"
                checked={draft.compareMode === mode.key}
                onChange={() => patch({ compareMode: mode.key })}
              />
              <span className="dot" />
              <span>
                {mode.label}
                <span className="text-muted"> — {mode.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* The design had a per-language multiplier table. This engine applies one
          budget to every language, so the table reports what is actually
          derived instead. */}
      <TableFrame>
        <TableScroll>
        <table className={tableClasses.table}>
        <thead>
          <tr className={tableClasses.headRow}>
            <th className={tableClasses.th}>Derived budget</th>
            <th className={tableClasses.th} style={{ width: 160 }}>Value</th>
            <th className={tableClasses.th}>Where it comes from</th>
          </tr>
        </thead>
        <tbody>
          <tr className={tableClasses.row}>
            <td className={tableClasses.td}>Per case</td>
            <td className={`mono ${tableClasses.td}`} style={{ fontSize: 12.5 }}>{draft.timeLimitMs} ms</td>
            <td className={tableClasses.td} style={{ fontSize: 13, opacity: 0.7 }}>Clamped to 250–5000 ms by buildLimits()</td>
          </tr>
          <tr className={tableClasses.row}>
            <td className={tableClasses.td}>Whole batch</td>
            <td className={`mono ${tableClasses.td}`} style={{ fontSize: 12.5 }}>{batchMs} ms</td>
            <td className={tableClasses.td} style={{ fontSize: 13, opacity: 0.7 }}>
              {caseCount} case{caseCount === 1 ? "" : "s"} in one engine call, capped at 15000 ms
            </td>
          </tr>
          <tr className={tableClasses.row}>
            <td className={tableClasses.td}>Memory</td>
            <td className={`mono ${tableClasses.td}`} style={{ fontSize: 12.5 }}>{draft.memoryLimitMb} MB</td>
            <td className={tableClasses.td} style={{ fontSize: 13, opacity: 0.7 }}>Enforced by the sandbox cgroup</td>
          </tr>
        </tbody>
        </table>
        </TableScroll>
      </TableFrame>
    </section>
  );
}
