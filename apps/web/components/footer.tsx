import Link from "next/link";
import { Logo } from "@/components/icons";

/**
 * The overflow shelf for everything that shouldn't eat navbar width:
 * secondary pages (about, contact), and a full map of the site's main
 * sections. The second job matters for SEO as much as for readers - a
 * footer that links every hub page from every page is the cheapest way to
 * make sure crawlers reach them all.
 */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Learn",
    links: [
      { label: "Tutorials", href: "/tutorials" },
      { label: "Digital Logic", href: "/tutorials/digital-logic" },
      { label: "Data Structures & Algorithms", href: "/tutorials/dsa" },
      { label: "Logic Problems", href: "/puzzles" },
      { label: "Coding Problems", href: "/practices" },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "Logic Editor", href: "/logic-editor" },
      { label: "Interactive Tools", href: "/tools" },
      { label: "Your Projects", href: "/projects" },
      { label: "Community Circuits", href: "/community" },
    ],
  },
  {
    heading: "More",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto max-w-330 px-6 py-12 sm:px-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-6 w-6 shrink-0 text-ink" />
              <span className="font-bold text-ink">Nandscape</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-soft">
              Learn computer science by building it. Free, no signup required.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate">{column.heading}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-ink-soft transition-colors hover:text-copper-dark">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-[11px] text-slate sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Nandscape. All rights reserved.</span>
          <span>Built for students, by a student.</span>
        </div>
      </div>
    </footer>
  );
}
