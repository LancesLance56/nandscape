/**
 * The faint routing guides behind the hero.
 *
 * Dashed traces that run past the content and turn on rounded corners, the way
 * a board layout routes around a component. They carry no meaning and are kept
 * close to invisible on purpose: the job is to give the whitespace a grain, not
 * to draw attention.
 *
 * Server-rendered and purely decorative, so it is hidden from assistive
 * technology and costs nothing at runtime.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-0 h-full w-full text-border-strong opacity-45 dark:opacity-30"
      >
        <g stroke="currentColor" strokeWidth="1" strokeDasharray="5 7">
          {/* Two verticals framing the column of copy. */}
          <path d="M 300 -20 V 340 Q 300 372 332 372 H 560" />
          <path d="M 1140 -20 V 300 Q 1140 332 1108 332 H 900" />
          {/* A long horizontal under the fold, tying the flow band together. */}
          <path d="M -20 690 H 380 Q 412 690 412 722 V 900" />
          <path d="M 1460 690 H 1060 Q 1028 690 1028 722 V 900" />
          <path d="M 720 900 V 812" />
        </g>

        {/* Junction dots where the guides turn, the one place the trace reads
            as a circuit rather than as decoration. */}
        <g fill="currentColor" className="opacity-70">
          <circle cx="300" cy="340" r="2.5" />
          <circle cx="1140" cy="300" r="2.5" />
          <circle cx="412" cy="722" r="2.5" />
          <circle cx="1028" cy="722" r="2.5" />
        </g>
      </svg>
    </div>
  );
}
