"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { ActivityCalendar, type Activity, type BlockElement } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";

/**
 * A year of learning, as a contribution graph.
 *
 * Built on react-activity-calendar rather than by hand. Drawing 365 rounded
 * rects is the easy part; what the library actually buys is the month and
 * weekday labelling, the keyboard and screen-reader handling, and the
 * awkward week-alignment maths at the year boundary.
 *
 * It wants a contiguous range, not a sparse list, so every day between the
 * first and today is materialised here even though almost all of them are
 * zero. Levels are bucketed rather than scaled to the busiest day, which keeps
 * the shading stable: one lesson always looks the same shade whether or not
 * you once did nine in an afternoon.
 */

const DAYS = 365;

/** Empty through busiest, as a green wash deepening on paper. */
const LIGHT = ["#ececec", "#d2e7d5", "#9fc9a6", "#5ba06c", "#1f6b33"];
const DARK = ["#282828", "#20351f", "#2f5a3a", "#3f8a53", "#52b869"];

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function LearningActivity({ counts }: { counts: Record<string, number> }) {
  const { resolvedTheme } = useTheme();

  const data = useMemo<Activity[]>(() => {
    const days: Activity[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = DAYS - 1; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      // Local formatting, matching how the server bucketed these (see
      // toDayKey); an ISO string here would shift days across the timezone.
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
        day.getDate(),
      ).padStart(2, "0")}`;
      const count = counts[key] ?? 0;
      days.push({ date: key, count, level: levelFor(count) });
    }

    return days;
  }, [counts]);

  const total = data.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Learning activity</h2>
        <span className="text-[11px] text-slate">
          {total === 0 ? "Nothing yet this year" : `${total} in the last year`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <ActivityCalendar
          data={data}
          // The library reads this rather than the document, so it has to be
          // told which scheme the site settled on.
          colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
          theme={{ light: LIGHT, dark: DARK }}
          blockSize={11}
          blockMargin={3}
          fontSize={11}
          weekStart={1}
          showTotalCount={false}
          labels={{
            totalCount: "{{count}} activities",
            legend: { less: "Less", more: "More" },
          }}
          renderBlock={(block: BlockElement, activity: Activity) => (
            <>
              {block}
              <title>
                {activity.count === 0
                  ? `Nothing on ${activity.date}`
                  : `${activity.count} on ${activity.date}`}
              </title>
            </>
          )}
        />
      </div>
    </div>
  );
}
