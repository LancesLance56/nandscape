import Link from "next/link";
import { HeroBfs } from "@/components/marketing/hero-bfs";

/**
 * The landing hero: what the site is, on the left, and a breadth-first search
 * you can play with on the right.
 *
 * One live widget, not a gallery of them. The page below is full of tools; the
 * hero only has to prove the promise in the headline, and a small search that
 * runs on its own and can be scrubbed does that in a glance.
 *
 * The copy is split in two around the widget so the order can change with the
 * width. On a desk it reads headline, topics, buttons with the widget beside
 * them; on a phone the widget moves up under the paragraph, so it lands on the
 * first screen instead of below the buttons.
 *
 * The near-black outlines and buttons are the hero's own. They flip to near-
 * white in dark mode, while the widget card stays white in both, which is what
 * makes it the brightest thing on a dark page.
 */

const CHIP =
  "inline-flex h-[34px] items-center rounded-[12px_12px_12px_4px] px-3.5 text-sm font-extrabold sm:h-10 sm:rounded-[14px_14px_14px_4px] sm:pl-4 sm:pr-[18px] sm:text-[15px]";

const BUTTON =
  "inline-flex h-[54px] items-center justify-center rounded-2xl px-7 text-base font-extrabold transition-transform duration-150 ease-out active:translate-y-0.5 motion-reduce:transition-none";

export function Hero() {
  return (
    <section className="relative pb-16 pt-24 sm:pb-24 sm:pt-32 lg:pt-36">
      <div className="grid items-center gap-x-14 gap-y-5 sm:gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4 sm:gap-6 lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1 className="font-display text-[38px] font-bold leading-[1.04] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[56px] lg:leading-[1.02]">
            Interactive guide to <br className="hidden sm:block" />
            <span className="text-[#e35f0e] dark:text-[#fd7b41]">computer science</span>
          </h1>
          <p className="max-w-[30rem] text-base leading-relaxed text-ink-soft sm:text-[19px] sm:leading-[1.6]">
            Each lesson teaches concepts through visuals and interactive widgets, helping you understand complex
            algorithms and concepts
          </p>
        </div>

        {/* The widget, with two brand blocks tucked behind it. They overhang
            the card, and on a phone past the screen edge; the homepage clips
            sideways at the viewport (app/page.tsx), not here, because a clip
            at any box narrower than the screen shaves the block flat. */}
        <div className="relative mx-1 my-3.5 sm:mx-6 sm:my-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0">
          <div
            aria-hidden
            className="absolute -right-7 -top-[22px] h-20 w-[150px] rotate-6 rounded-[24px_24px_14px_14px] bg-[#ff751a] sm:-right-10 sm:-top-12 sm:h-40 sm:w-80 sm:rounded-[40px_40px_24px_24px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-[18px] -left-6 h-16 w-[130px] -rotate-[5deg] rounded-2xl bg-[#3772ff] sm:-bottom-10 sm:-left-8 sm:h-[120px] sm:w-[260px] sm:rounded-3xl"
          />
          <HeroBfs />
        </div>

        <div className="flex flex-col gap-5 sm:gap-6 lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="flex flex-wrap gap-2 sm:gap-2.5" aria-label="Topics">
            <span className={`${CHIP} bg-[#ff751a] text-[#1d1f22]`}>Logic gates</span>
            <span className={`${CHIP} bg-[#3772ff] text-white`}>Graphs</span>
            <span className={`${CHIP} bg-[#fdca40] text-[#1d1f22]`}>K-maps</span>
            <span className={`${CHIP} bg-[#1d1f22] text-white dark:bg-[#efeeed] dark:text-[#1d1f22]`}>
              Coding practice
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <Link
              href="/tutorials"
              className={`${BUTTON} bg-[#1d1f22] text-white shadow-[0_4px_0_#ff751a] hover:bg-black dark:bg-[#efeeed] dark:text-[#1d1f22] dark:hover:bg-white`}
            >
              Start learning
            </Link>
            <Link
              href="/puzzles"
              className={`${BUTTON} border-2 border-[#1d1f22] text-ink hover:bg-surface-2 dark:border-[#efeeed]`}
            >
              All puzzles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
