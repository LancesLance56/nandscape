"use client";

import { useState, type ReactNode } from "react";
import { useBlogEditorStore } from "@/store/blog-editor-store";
import { slugify, type DocumentStatus } from "@/lib/blog-editor/types";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@/lib/seo/metadata";
import type { TutorialSection } from "@/types/tutorial";

const STATUS_OPTIONS: DocumentStatus[] = ["draft", "published", "archived"];

/** Search engines cut these off at a known width, and a truncated title or
 *  description is a wasted result - show the budget while writing rather
 *  than discovering it in a crawl report. Empty is fine (it falls back), so
 *  only a value that's actually over the line is flagged. */
function LengthHint({ value, max }: { value: string; max: number }) {
  if (!value) return null;
  const over = value.length > max;
  return (
    <span className={`mt-1 block text-[10px] ${over ? "text-signal-coral" : "text-slate"}`}>
      {value.length} / {max}
      {over ? " - will be truncated in results" : ""}
    </span>
  );
}

// Lighter than fieldInputClass on purpose - this strip sits directly under
// the title with no card around it, so a full boxed input per field would
// just recreate the "everything is its own island" problem one level down.
// No border at rest, just a soft fill on focus - a permanent underline on
// every field reads as its own little divider repeated five times.
const compactInputClass =
  "min-w-0 rounded-md bg-transparent px-1 py-0.5 text-sm text-ink outline-none focus:bg-surface-2";

function InlineField({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex items-center gap-1.5 ${className}`}>
      <span className=" text-[10px] font-semibold text-slate">{label}</span>
      {children}
    </label>
  );
}

export function MetadataPanel({ sections = [] }: { sections?: TutorialSection[] }) {
  const metadata = useBlogEditorStore((s) => s.metadata);
  const documentKind = useBlogEditorStore((s) => s.documentKind);
  const setMetadata = useBlogEditorStore((s) => s.setMetadata);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Title reads like the top of the document, not a form field -
          matches how PreviewPane's h1 will actually render it. */}
      <input
        value={metadata.title}
        onChange={(e) => {
          const title = e.target.value;
          // Keep slug following the title only until the author has
          // diverged it from the auto-generated value - avoids a separate
          // "has the user touched this" flag by comparing against what
          // auto-generation would currently produce.
          const wasFollowingTitle = metadata.slug === slugify(metadata.title);
          setMetadata(wasFollowingTitle ? { title, slug: slugify(title) } : { title });
        }}
        placeholder="Untitled"
        className="w-full bg-transparent font-display text-3xl font-bold text-ink outline-none placeholder:text-border-strong"
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <InlineField label="Slug">
          <input
            className={`${compactInputClass} w-40`}
            value={metadata.slug}
            onChange={(e) => setMetadata({ slug: slugify(e.target.value) })}
          />
        </InlineField>

        <InlineField label="Status">
          <select
            className={`${compactInputClass} w-24`}
            value={metadata.status}
            onChange={(e) => setMetadata({ status: e.target.value as DocumentStatus })}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </InlineField>

        <InlineField label="Published">
          <input
            type="date"
            className={`${compactInputClass} w-32`}
            value={metadata.publishedAt?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setMetadata({ publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </InlineField>

        <InlineField label="Tags" className="min-w-40 flex-1">
          <input
            className={`${compactInputClass} w-full`}
            defaultValue={metadata.tags.join(", ")}
            onBlur={(e) =>
              setMetadata({
                tags: e.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
        </InlineField>

        {documentKind === "tutorial" && (
          <>
            <InlineField label="Section" className="min-w-40">
              {sections.length > 0 ? (
                <select
                  className={`${compactInputClass} w-full`}
                  value={metadata.sectionId ?? ""}
                  onChange={(e) => setMetadata({ sectionId: e.target.value || null })}
                >
                  <option value="">Standalone</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              ) : (
                // No sections exist in the DB yet - fall back to a raw ID
                // field rather than showing an empty, unusable dropdown.
                <input
                  className={`${compactInputClass} w-full`}
                  value={metadata.sectionId ?? ""}
                  onChange={(e) => setMetadata({ sectionId: e.target.value || null })}
                  placeholder="Standalone"
                />
              )}
            </InlineField>
            <InlineField label="Position">
              <input
                type="number"
                className={`${compactInputClass} w-14`}
                value={metadata.position}
                onChange={(e) => setMetadata({ position: Number(e.target.value) || 0 })}
              />
            </InlineField>
          </>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate transition-colors hover:text-ink"
        >
          More details
          <svg
            viewBox="0 0 16 16"
            className={`h-3 w-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {detailsOpen && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Excerpt">
                <textarea
                  className={`${fieldInputClass} resize-y`}
                  rows={2}
                  value={metadata.excerpt}
                  onChange={(e) => setMetadata({ excerpt: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Cover image URL">
              <input
                className={fieldInputClass}
                value={metadata.coverImage}
                onChange={(e) => setMetadata({ coverImage: e.target.value })}
              />
            </Field>
            <Field label="Author">
              <input
                className={fieldInputClass}
                value={metadata.authorName}
                onChange={(e) => setMetadata({ authorName: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2">
              <div className="mb-2 mt-1 border-t border-border pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate">
                Search appearance
              </div>
            </div>

            <div className="sm:col-span-2">
              <Field label="SEO title">
                <input
                  className={fieldInputClass}
                  placeholder={metadata.title || "Falls back to the title above"}
                  value={metadata.seoTitle}
                  onChange={(e) => setMetadata({ seoTitle: e.target.value })}
                />
                <LengthHint value={metadata.seoTitle} max={MAX_TITLE_LENGTH} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Meta description">
                <textarea
                  className={`${fieldInputClass} resize-y`}
                  rows={2}
                  placeholder={metadata.excerpt || "Falls back to the excerpt above"}
                  value={metadata.seoDescription}
                  onChange={(e) => setMetadata({ seoDescription: e.target.value })}
                />
                <LengthHint value={metadata.seoDescription} max={MAX_DESCRIPTION_LENGTH} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Target keywords (comma separated)">
                <input
                  className={fieldInputClass}
                  placeholder="binary to decimal, number bases"
                  value={metadata.keywords.join(", ")}
                  onChange={(e) =>
                    setMetadata({
                      keywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
