"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { EmbedChromeProvider } from "./embed-chrome";
import type { EmbedOptions } from "@/lib/embeds/embeddable";

/**
 * Everything an embed page is, besides the thing being embedded.
 *
 * That comes to very little: no header, no card, no title bar. The host page
 * has already framed and captioned this iframe, so a second frame drawn inside
 * the first only makes the embed look pasted on. What remains are the few
 * things the host cannot do for us: forcing the colour scheme, reporting the
 * content height, and the credit link.
 */
export function EmbedShell({
  children,
  options,
  title,
  sourceUrl,
  bleed = false,
}: {
  children: ReactNode;
  options: EmbedOptions;
  title: string;
  /** Absolute URL of the page this came from. */
  sourceUrl: string;
  /**
   * Fill the iframe exactly instead of flowing.
   *
   * A canvas such as a circuit or a graph has no natural height: it is a
   * viewport onto something bigger, and it wants every pixel the host gave it.
   * A widget works the other way round. It is a column of controls as tall as
   * its content, and a fixed viewport would stretch or clip it.
   */
  bleed?: boolean;
}) {
  return (
    <EmbedChromeProvider>
      <EmbedTheme theme={options.theme} />
      {!bleed && <AutoHeightReporter />}

      {bleed ? (
        <div className="fixed inset-0 bg-surface">{children}</div>
      ) : (
        <div className="min-h-screen w-full bg-surface p-3 sm:p-4">{children}</div>
      )}

      {options.credit && <CreditLink title={title} href={sourceUrl} />}
    </EmbedChromeProvider>
  );
}

/**
 * `?theme=` beats the reader's system setting.
 *
 * An embed has no theme toggle of its own, so the host page's author is the
 * only one who can say what it should be. They also know things we do not,
 * such as that their site is dark only. Left on `auto`, the root provider's
 * system detection applies, which suits a blog that follows its reader.
 *
 * Routed through next-themes rather than by setting the class directly, so
 * the provider and the DOM cannot disagree about which theme is active.
 */
function EmbedTheme({ theme }: { theme: EmbedOptions["theme"] }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme === "auto" ? "system" : theme);
  }, [theme, setTheme]);

  return null;
}

/**
 * Tells the host page how tall the content actually is.
 *
 * An iframe cannot size itself: the host picked a height when it pasted the
 * snippet, and a widget that grows past it gets a scrollbar. Embed providers
 * generally settle on posting the height out and letting the host apply it, so
 * that is what this does. A host that ignores the message keeps the fixed
 * height it asked for.
 *
 * The message is namespaced and versioned because a page may be listening to
 * several embed providers at once, and acting on `event.data.height` from an
 * unknown sender is how host pages resize the wrong frame.
 */
function AutoHeightReporter() {
  const last = useRef(0);

  useEffect(() => {
    if (window.parent === window) return;

    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      // Sub-pixel churn from a running animation would otherwise post on
      // every frame, and each post is a cross-origin structured clone.
      if (Math.abs(height - last.current) < 2) return;
      last.current = height;
      window.parent.postMessage({ type: "nandscape:embed:height", version: 1, height }, "*");
    };

    post();

    // Widgets change height for reasons no event covers: a K-map group being
    // outlined, a flowchart note panel opening, a font finally loading.
    // Observing the document catches all of them.
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    window.addEventListener("load", post);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return null;
}

/**
 * The only thing an embed asks for in return, and `?credit=0` turns it off.
 *
 * A single small line in the corner rather than a badge or an overlay, since
 * people crop out embeds that advertise over their own content.
 */
function CreditLink({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="fixed bottom-2 right-2 z-50 rounded-lg border border-border bg-surface-card/90 px-2.5 py-1 text-[10px] font-medium text-ink-soft no-underline backdrop-blur-sm transition-colors hover:text-copper-dark"
    >
      {title ? `${title} · ` : ""}Built with Nandscape
    </a>
  );
}
