/**
 * Every two-pointer algorithm the tutorials walk through, recorded frame by
 * frame.
 *
 * Grouped by the shape of the pointer movement rather than by the problem,
 * because the shape is the transferable part. There are only three shapes in
 * this file:
 *
 *   1. Converging  - one pointer at each end, walking towards each other.
 *      Each step discards the cell it leaves, so the pass is O(n).
 *   2. Same direction - a fast pointer that scans and a slow pointer that
 *      writes or trails, which is where sliding windows and in-place rewrites
 *      come from.
 *   3. Two sequences - one pointer per array, advancing whichever one is
 *      behind.
 *
 * Nothing here mutates its input.
 */

import {
  createRecorder,
  lane,
  outside,
  type CellTone,
  type TwoPointerRun,
} from "./types";

const asc = (x: number, y: number) => x - y;

/* =========================================================================
 * 1. Converging pointers
 * ====================================================================== */

/**
 * Two Sum on a sorted array.
 *
 * The seed of the whole technique. `a[lo] + a[hi]` is the largest sum
 * available to `lo` and the smallest available to `hi`, so a sum that is too
 * small rules out `lo` against *every* remaining partner at once, not just
 * against `hi`. That is the elimination the O(n) claim rests on.
 */
export function twoSumSortedSteps(values: number[], target: number): TwoPointerRun {
  const rec = createRecorder();
  const a = [...values].sort(asc);
  const n = a.length;
  const results: string[] = [];
  let lo = 0;
  let hi = n - 1;

  const draw = (tones: Record<number, CellTone> = {}) => [
    lane("sorted", a, { L: lo, R: hi }, { tones: { ...outside(n, lo, hi), ...tones } }),
  ];
  const stats = (sum?: number) => [
    { label: "target", value: target },
    { label: "L + R", value: sum ?? "-" },
    { label: "pairs", value: results.length, tone: "good" as const },
  ];

  rec.push(
    `L starts on the smallest value, R on the largest. Looking for pairs summing to ${target}.`,
    { lanes: draw(), results, stats: stats() },
  );

  while (lo < hi) {
    const sum = a[lo] + a[hi];
    rec.countCompare();

    if (sum === target) {
      results.push(`${a[lo]} + ${a[hi]}`);
      if (
        !rec.push(`${a[lo]} + ${a[hi]} = ${target}. Bank the pair, then move both pointers inward.`, {
          lanes: draw({ [lo]: "hit", [hi]: "hit" }),
          results,
          stats: stats(sum),
          tone: "hit",
        })
      )
        break;
      lo++;
      hi--;
      // Skipping equal values keeps the answer list free of duplicate pairs.
      while (lo < hi && a[lo] === a[lo - 1]) lo++;
      while (lo < hi && a[hi] === a[hi + 1]) hi--;
    } else if (sum < target) {
      if (
        !rec.push(
          `${a[lo]} + ${a[hi]} = ${sum}, under ${target}. R is already the largest value left, so nothing can rescue ${a[lo]}: drop it and move L up.`,
          { lanes: draw({ [lo]: "active", [hi]: "active" }), results, stats: stats(sum), tone: "miss" },
        )
      )
        break;
      lo++;
    } else {
      if (
        !rec.push(
          `${a[lo]} + ${a[hi]} = ${sum}, over ${target}. L is already the smallest value left, so ${a[hi]} is too big for any partner: drop it and move R down.`,
          { lanes: draw({ [lo]: "active", [hi]: "active" }), results, stats: stats(sum), tone: "miss" },
        )
      )
        break;
      hi--;
    }
  }

  rec.push(
    results.length > 0
      ? `Pointers met. ${results.length} pair(s) found, in one pass over ${n} values.`
      : `Pointers met with no pair summing to ${target}. Still only one pass.`,
    { lanes: draw(), results, stats: stats() },
  );

  return rec.finish(
    results.length > 0 ? results.join(", ") : `no pair sums to ${target}`,
    "O(n) after sorting",
  );
}

/**
 * Sentence palindrome: compare ends inward, skipping anything that is not a
 * letter or digit and ignoring case.
 *
 * The pointer movement is the easy half. The half people get wrong is that
 * skipping is not symmetric - each pointer skips on its own, so the two
 * skip loops have to be separate from the comparison.
 */
export function sentencePalindromeSteps(text: string): TwoPointerRun {
  const rec = createRecorder();
  const chars = [...text];
  const n = chars.length;
  const alnum = (c: string) => /[a-z0-9]/i.test(c);

  // Punctuation and spaces are greyed from the first frame: they are never
  // compared, so showing them as live candidates would be a lie.
  const ignored: Record<number, CellTone> = {};
  for (let i = 0; i < n; i++) if (!alnum(chars[i])) ignored[i] = "dropped";

  const shown = chars.map((c) => (c === " " ? "␣" : c));
  let lo = 0;
  let hi = n - 1;
  let verdict = true;

  const draw = (tones: Record<number, CellTone> = {}) => [
    lane("text", shown, { L: lo, R: hi }, { tones: { ...ignored, ...tones } }),
  ];

  rec.push("Ignore case, spaces and punctuation, then compare the ends inward.", {
    lanes: draw(),
    results: [],
  });

  while (lo < hi) {
    if (!alnum(chars[lo])) {
      if (!rec.push(`"${shown[lo]}" is not a letter or digit, so L steps over it.`, { lanes: draw(), results: [] }))
        break;
      lo++;
      continue;
    }
    if (!alnum(chars[hi])) {
      if (!rec.push(`"${shown[hi]}" is not a letter or digit, so R steps over it.`, { lanes: draw(), results: [] }))
        break;
      hi--;
      continue;
    }

    const l = chars[lo].toLowerCase();
    const r = chars[hi].toLowerCase();
    rec.countCompare();

    if (l === r) {
      if (
        !rec.push(`"${l}" matches "${r}". Move both inward.`, {
          lanes: draw({ [lo]: "hit", [hi]: "hit" }),
          results: [],
          tone: "hit",
        })
      )
        break;
      lo++;
      hi--;
    } else {
      verdict = false;
      rec.push(`"${l}" against "${r}". Mismatch, so it is not a palindrome. Stop here - no need to check the rest.`, {
        lanes: draw({ [lo]: "active", [hi]: "active" }),
        results: [],
        tone: "miss",
      });
      break;
    }
  }

  if (verdict) {
    rec.push("The pointers crossed with every pair matching, so the sentence is a palindrome.", {
      lanes: draw(),
      results: [],
      tone: "hit",
    });
  }

  return rec.finish(verdict ? "palindrome" : "not a palindrome", "O(n) time, O(1) space");
}

/**
 * Container with most water: the widest pair first, then trade width for
 * height.
 *
 * Area is `min(h[lo], h[hi]) * (hi - lo)`, so moving the *taller* wall inward
 * loses width and cannot gain height - the shorter wall still caps it. Only
 * the shorter wall is worth moving, which is why one pass suffices.
 */
export function containerWaterSteps(heights: number[]): TwoPointerRun {
  const rec = createRecorder();
  const h = [...heights];
  const n = h.length;
  let lo = 0;
  let hi = n - 1;
  let best = 0;
  let bestPair: [number, number] = [0, n - 1];

  const draw = (tones: Record<number, CellTone> = {}) => [
    lane("heights", h, { L: lo, R: hi }, { tones: { ...outside(n, lo, hi, "dropped"), ...tones } }),
  ];
  const stats = (area: number) => [
    { label: "this area", value: area },
    { label: "best", value: best, tone: "good" as const },
    { label: "width", value: hi - lo },
  ];

  rec.push("Start at the widest possible container: the first and last walls.", {
    lanes: draw(),
    results: [],
    stats: stats(0),
  });

  while (lo < hi) {
    const area = Math.min(h[lo], h[hi]) * (hi - lo);
    rec.countCompare();
    const improved = area > best;
    if (improved) {
      best = area;
      bestPair = [lo, hi];
    }

    if (
      !rec.push(
        `min(${h[lo]}, ${h[hi]}) × ${hi - lo} = ${area}.${improved ? " That is the best so far." : " Not an improvement."}`,
        {
          lanes: draw({ [lo]: "hit", [hi]: "hit" }),
          results: [],
          stats: stats(area),
          tone: improved ? "hit" : "miss",
        },
      )
    )
      break;

    if (h[lo] <= h[hi]) {
      if (
        !rec.push(
          `The left wall (${h[lo]}) is the shorter one. Moving the taller wall could only lose width, so move L.`,
          { lanes: draw({ [lo]: "active" }), results: [], stats: stats(area) },
        )
      )
        break;
      lo++;
    } else {
      if (
        !rec.push(
          `The right wall (${h[hi]}) is the shorter one. Moving the taller wall could only lose width, so move R.`,
          { lanes: draw({ [hi]: "active" }), results: [], stats: stats(area) },
        )
      )
        break;
      hi--;
    }
  }

  lo = bestPair[0];
  hi = bestPair[1];
  rec.push(`Pointers met. The best container is walls ${bestPair[0]} and ${bestPair[1]}, holding ${best}.`, {
    lanes: draw({ [bestPair[0]]: "kept", [bestPair[1]]: "kept" }),
    results: [`area ${best}`],
    stats: stats(best),
    tone: "hit",
  });

  return rec.finish(`max area ${best}`, "O(n) time, O(1) space");
}

/* =========================================================================
 * 2. Same direction: read/write and sliding windows
 * ====================================================================== */

/**
 * Unique elements of a sorted array, in place.
 *
 * A read pointer that never stops and a write pointer that only advances on a
 * value it has not seen. Everything before `write` is the answer; everything
 * from `write` on is scratch space the caller is told to ignore.
 */
export function uniqueElementsSteps(values: number[]): TwoPointerRun {
  const rec = createRecorder();
  const a = [...values].sort(asc);
  const n = a.length;
  if (n === 0) return rec.finish("empty", "O(n)");

  let write = 1;
  const draw = (read: number, tones: Record<number, CellTone> = {}) => {
    const base: Record<number, CellTone> = {};
    for (let i = 0; i < write; i++) base[i] = "kept";
    return [lane("array", a, { write, read }, { tones: { ...base, ...tones } })];
  };
  const stats = () => [
    { label: "unique so far", value: write, tone: "good" as const },
    { label: "scanned", value: 0 },
  ];

  rec.push("The array is sorted, so duplicates are adjacent. Position 0 is always unique, so write starts at 1.", {
    lanes: draw(1),
    results: [String(a[0])],
    stats: stats(),
  });

  for (let read = 1; read < n; read++) {
    rec.countCompare();
    const isNew = a[read] !== a[write - 1];

    if (isNew) {
      a[write] = a[read];
      if (
        !rec.push(
          `${a[read]} differs from the last kept value (${a[write - 1]}), so copy it to position ${write} and advance write.`,
          {
            lanes: draw(read, { [read]: "hit", [write]: "hit" }),
            results: a.slice(0, write + 1).map(String),
            stats: stats(),
            tone: "hit",
          },
        )
      )
        break;
      write++;
    } else {
      if (
        !rec.push(`${a[read]} equals the last kept value, so it is a duplicate. Read moves on, write stays put.`, {
          lanes: draw(read, { [read]: "dropped" }),
          results: a.slice(0, write).map(String),
          stats: stats(),
          tone: "miss",
        })
      )
        break;
    }
  }

  const answer = a.slice(0, write);
  rec.push(`One pass, no extra array. The first ${write} positions hold the unique values.`, {
    lanes: draw(n),
    results: answer.map(String),
    stats: stats(),
    tone: "hit",
  });

  return rec.finish(`${write} unique values: ${answer.join(", ")}`, "O(n) time, O(1) space");
}

/**
 * Smallest subarray with a sum at least `target`, on positive values.
 *
 * The window only ever grows on the right and shrinks on the left, so both
 * pointers move forward at most n times each - O(n) despite the nested loop
 * on the page. Positivity is the precondition that makes shrinking safe:
 * with a negative value in the array, dropping a left element could *raise*
 * the sum, and the whole argument collapses.
 */
export function smallestSubarraySteps(values: number[], target: number): TwoPointerRun {
  const rec = createRecorder();
  const a = [...values];
  const n = a.length;
  let start = 0;
  let sum = 0;
  let best = Infinity;
  let bestSpan: [number, number] | null = null;

  const draw = (end: number, tones: Record<number, CellTone> = {}) => {
    const base: Record<number, CellTone> = {};
    for (let i = start; i <= end && i < n; i++) base[i] = "window";
    for (let i = 0; i < start; i++) base[i] = "dropped";
    return [lane("values", a, { start, end }, { tones: { ...base, ...tones } })];
  };
  const stats = () => [
    { label: "window sum", value: sum },
    { label: "target", value: target },
    { label: "best length", value: best === Infinity ? "-" : best, tone: "good" as const },
  ];

  rec.push(`Grow the window on the right until the sum reaches ${target}, then shrink it from the left.`, {
    lanes: draw(-1),
    results: [],
    stats: stats(),
  });

  for (let end = 0; end < n; end++) {
    sum += a[end];
    rec.countCompare();
    if (
      !rec.push(`Take ${a[end]} into the window. Sum is ${sum}.`, {
        lanes: draw(end, { [end]: "active" }),
        results: bestSpan ? [`[${bestSpan[0]}..${bestSpan[1]}] length ${best}`] : [],
        stats: stats(),
      })
    )
      break;

    while (sum >= target) {
      const len = end - start + 1;
      if (len < best) {
        best = len;
        bestSpan = [start, end];
      }
      if (
        !rec.push(
          `Sum ${sum} reaches ${target} with length ${len}${len === best ? ", the shortest yet" : ""}. Now try dropping ${a[start]} from the left.`,
          {
            lanes: draw(end, { [start]: "hit", [end]: "hit" }),
            results: bestSpan ? [`[${bestSpan[0]}..${bestSpan[1]}] length ${best}`] : [],
            stats: stats(),
            tone: "hit",
          },
        )
      )
        break;
      sum -= a[start];
      start++;
    }
    if (rec.stopped) break;
  }

  rec.push(
    bestSpan
      ? `Shortest window: positions ${bestSpan[0]} to ${bestSpan[1]}, length ${best}. Each pointer moved forward at most ${n} times.`
      : `No window reaches ${target}. Each pointer still moved forward at most ${n} times.`,
    {
      lanes: draw(n - 1),
      results: bestSpan ? [`[${bestSpan[0]}..${bestSpan[1]}] length ${best}`] : [],
      stats: stats(),
      tone: bestSpan ? "hit" : "miss",
    },
  );

  return rec.finish(bestSpan ? `length ${best}` : "no such window", "O(n) time, O(1) space");
}

/**
 * Reverse the words of a sentence in place: reverse the whole thing, then
 * reverse each word back.
 *
 * Both phases are the same converging-pointer swap loop, which is the reason
 * this problem lives on a two-pointer page at all.
 */
export function reverseWordsSteps(text: string): TwoPointerRun {
  const rec = createRecorder();
  const a = [...text];
  const n = a.length;
  const shown = () => a.map((c) => (c === " " ? "␣" : c));

  const draw = (lo: number, hi: number, tones: Record<number, CellTone> = {}, done?: number) => {
    const base: Record<number, CellTone> = {};
    if (done !== undefined) for (let i = 0; i < done; i++) base[i] = "kept";
    return [lane("chars", shown(), { L: lo, R: hi }, { tones: { ...base, ...tones } })];
  };

  const swap = (lo: number, hi: number) => {
    const t = a[lo];
    a[lo] = a[hi];
    a[hi] = t;
  };

  rec.push("Phase 1: reverse the entire string with one converging swap loop.", {
    lanes: draw(0, n - 1),
    results: [],
  });

  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    swap(lo, hi);
    rec.countCompare();
    if (
      !rec.push(`Swap positions ${lo} and ${hi}.`, {
        lanes: draw(lo, hi, { [lo]: "hit", [hi]: "hit" }),
        results: [],
      })
    )
      return rec.finish(a.join(""), "O(n) time, O(1) space");
    lo++;
    hi--;
  }

  rec.push(
    "The whole string is reversed, which puts the words in the right order but spells each one backwards. Phase 2 fixes that.",
    { lanes: draw(-1, -1), results: [], tone: "hit" },
  );

  // Phase 2: the same loop again, once per word.
  let i = 0;
  while (i < n) {
    if (a[i] === " ") {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && a[j + 1] !== " ") j++;

    if (
      !rec.push(`Found a word spanning ${i} to ${j}. Reverse it with the same two-pointer swap.`, {
        lanes: draw(i, j, {}, i),
        results: [],
      })
    )
      break;

    let wl = i;
    let wr = j;
    while (wl < wr) {
      swap(wl, wr);
      rec.countCompare();
      if (
        !rec.push(`Swap ${wl} and ${wr}.`, {
          lanes: draw(wl, wr, { [wl]: "hit", [wr]: "hit" }, i),
          results: [],
        })
      )
        break;
      wl++;
      wr--;
    }
    if (rec.stopped) break;
    i = j + 1;
  }

  const out = a.join("");
  rec.push(`Done: "${out}". Two passes, no extra string.`, {
    lanes: draw(-1, -1, {}, n),
    results: [out],
    tone: "hit",
  });

  return rec.finish(`"${out}"`, "O(n) time, O(1) extra space");
}

/* =========================================================================
 * 3. Triplets and quadruplets: a fixed prefix plus a converging pair
 * ====================================================================== */

type TripletMode = "exact" | "count" | "closest";

/**
 * 3Sum, count-of-triplets-under-target, and closest-triplet in one generator,
 * because they are one algorithm with three different things done at the
 * comparison.
 *
 * Sort, fix the leftmost element, then run the Two Sum pass on the suffix.
 * The `count` variant is the one worth staring at: when `a[i]+a[lo]+a[hi]` is
 * under the target, *every* partner between `lo` and `hi` also works, because
 * they are all no larger than `a[hi]`. So the whole block counts at once.
 */
function tripletSteps(values: number[], target: number, mode: TripletMode): TwoPointerRun {
  const rec = createRecorder();
  const a = [...values].sort(asc);
  const n = a.length;
  const results: string[] = [];
  let count = 0;
  let bestSum = Infinity;
  let bestTriplet = "";

  const label =
    mode === "exact"
      ? `triplets summing to ${target}`
      : mode === "count"
        ? `triplets summing to less than ${target}`
        : `the triplet closest to ${target}`;

  const draw = (i: number, lo: number, hi: number, tones: Record<number, CellTone> = {}) => {
    const base: Record<number, CellTone> = { ...outside(n, lo, hi) };
    for (let k = 0; k <= i && k < n; k++) base[k] = k === i ? "kept" : "dropped";
    return [lane("sorted", a, { i, L: lo, R: hi }, { tones: { ...base, ...tones } })];
  };
  const stats = (sum?: number) => {
    const s = [
      { label: "i + L + R", value: sum ?? "-" },
      { label: "target", value: target },
    ];
    if (mode === "count") s.push({ label: "count", value: count });
    else if (mode === "closest") s.push({ label: "best", value: bestSum === Infinity ? "-" : bestSum });
    else s.push({ label: "found", value: results.length });
    return s;
  };

  rec.push(`Sorted. Fix i on the leftmost value, then run a converging pair over everything to its right: ${label}.`, {
    lanes: draw(0, 1, n - 1),
    results,
    stats: stats(),
  });

  for (let i = 0; i < n - 2; i++) {
    if (mode === "exact" && i > 0 && a[i] === a[i - 1]) {
      if (
        !rec.push(`a[i] repeats ${a[i]}, which would only re-find the same triplets. Skip it.`, {
          lanes: draw(i, i + 1, n - 1, { [i]: "dropped" }),
          results,
          stats: stats(),
          tone: "miss",
        })
      )
        break;
      continue;
    }

    let lo = i + 1;
    let hi = n - 1;
    if (
      !rec.push(`Fix i = ${a[i]}. The pair now has to make ${mode === "closest" ? "" : "up "}${target - a[i]}.`, {
        lanes: draw(i, lo, hi),
        results,
        stats: stats(),
      })
    )
      break;

    while (lo < hi) {
      const sum = a[i] + a[lo] + a[hi];
      rec.countCompare();

      if (mode === "count") {
        if (sum < target) {
          const block = hi - lo;
          count += block;
          if (
            !rec.push(
              `${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}, under ${target}. Every partner from L up to R works too, so that is ${block} triplets counted in one step. Move L up.`,
              { lanes: draw(i, lo, hi, { [lo]: "hit", [hi]: "hit" }), results, stats: stats(sum), tone: "hit" },
            )
          )
            break;
          lo++;
        } else {
          if (
            !rec.push(`${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}, not under ${target}. R is too big: move it down.`, {
              lanes: draw(i, lo, hi, { [hi]: "active" }),
              results,
              stats: stats(sum),
              tone: "miss",
            })
          )
            break;
          hi--;
        }
      } else if (mode === "closest") {
        if (Math.abs(sum - target) < Math.abs(bestSum - target)) {
          bestSum = sum;
          bestTriplet = `${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}`;
          results.length = 0;
          results.push(bestTriplet);
        }
        if (sum === target) {
          rec.push(`${a[i]} + ${a[lo]} + ${a[hi]} = ${target} exactly. Nothing can beat a distance of zero, so stop.`, {
            lanes: draw(i, lo, hi, { [i]: "hit", [lo]: "hit", [hi]: "hit" }),
            results,
            stats: stats(sum),
            tone: "hit",
          });
          return rec.finish(bestTriplet, "O(n²) after sorting");
        }
        if (
          !rec.push(
            `${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}, ${Math.abs(sum - target)} away from ${target}. ${
              sum < target ? "Too small, so move L up." : "Too big, so move R down."
            }`,
            {
              lanes: draw(i, lo, hi, { [lo]: "active", [hi]: "active" }),
              results,
              stats: stats(sum),
              tone: sum === bestSum ? "hit" : "miss",
            },
          )
        )
          break;
        if (sum < target) lo++;
        else hi--;
      } else {
        if (sum === target) {
          results.push(`${a[i]} + ${a[lo]} + ${a[hi]}`);
          if (
            !rec.push(`${a[i]} + ${a[lo]} + ${a[hi]} = ${target}. A triplet. Move both pointers past their duplicates.`, {
              lanes: draw(i, lo, hi, { [i]: "hit", [lo]: "hit", [hi]: "hit" }),
              results,
              stats: stats(sum),
              tone: "hit",
            })
          )
            break;
          lo++;
          hi--;
          while (lo < hi && a[lo] === a[lo - 1]) lo++;
          while (lo < hi && a[hi] === a[hi + 1]) hi--;
        } else if (sum < target) {
          if (
            !rec.push(`${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}, under ${target}. Move L up for a bigger sum.`, {
              lanes: draw(i, lo, hi, { [lo]: "active" }),
              results,
              stats: stats(sum),
              tone: "miss",
            })
          )
            break;
          lo++;
        } else {
          if (
            !rec.push(`${a[i]} + ${a[lo]} + ${a[hi]} = ${sum}, over ${target}. Move R down for a smaller sum.`, {
              lanes: draw(i, lo, hi, { [hi]: "active" }),
              results,
              stats: stats(sum),
              tone: "miss",
            })
          )
            break;
          hi--;
        }
      }
      if (rec.stopped) break;
    }
    if (rec.stopped) break;
  }

  const answer =
    mode === "count"
      ? `${count} triplets`
      : mode === "closest"
        ? bestTriplet || "none"
        : results.length > 0
          ? results.join(", ")
          : "none";

  rec.push(
    mode === "count"
      ? `${count} triplets in total. The inner pass is O(n) per i, so O(n²) overall - against O(n³) for three nested loops.`
      : mode === "closest"
        ? `Closest triplet: ${bestTriplet}.`
        : results.length > 0
          ? `${results.length} triplet(s) found in O(n²).`
          : "No triplet sums to the target.",
    { lanes: draw(n - 1, n - 1, n - 1), results, stats: stats(), tone: "hit" },
  );

  return rec.finish(answer, "O(n²) after sorting");
}

export function threeSumSteps(values: number[], target = 0): TwoPointerRun {
  return tripletSteps(values, target, "exact");
}

export function countTripletsSteps(values: number[], target: number): TwoPointerRun {
  return tripletSteps(values, target, "count");
}

export function closestTripletSteps(values: number[], target: number): TwoPointerRun {
  return tripletSteps(values, target, "closest");
}

/**
 * 4Sum: two fixed indices instead of one, then the same converging pair.
 *
 * The pattern generalises to k-Sum - each extra element costs one more nested
 * loop, and the innermost two are always the pair. The pruning matters more
 * here than it reads: without skipping duplicate i and j the answer list fills
 * with the same quadruplet over and over.
 */
export function fourSumSteps(values: number[], target: number): TwoPointerRun {
  const rec = createRecorder();
  const a = [...values].sort(asc);
  const n = a.length;
  const results: string[] = [];

  const draw = (i: number, j: number, lo: number, hi: number, tones: Record<number, CellTone> = {}) => {
    const base: Record<number, CellTone> = { ...outside(n, lo, hi) };
    for (let k = 0; k <= j && k < n; k++) base[k] = k === i || k === j ? "kept" : "dropped";
    return [lane("sorted", a, { i, j, L: lo, R: hi }, { tones: { ...base, ...tones } })];
  };
  const stats = (sum?: number) => [
    { label: "sum", value: sum ?? "-" },
    { label: "target", value: target },
    { label: "found", value: results.length, tone: "good" as const },
  ];

  rec.push(`Sorted. Fix i and j, then the pair L/R has to make ${target} minus those two.`, {
    lanes: draw(0, 1, 2, n - 1),
    results,
    stats: stats(),
  });

  for (let i = 0; i < n - 3; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    for (let j = i + 1; j < n - 2; j++) {
      if (j > i + 1 && a[j] === a[j - 1]) continue;

      let lo = j + 1;
      let hi = n - 1;
      const need = target - a[i] - a[j];
      if (
        !rec.push(`Fix ${a[i]} and ${a[j]}. The pair now has to make ${need}.`, {
          lanes: draw(i, j, lo, hi),
          results,
          stats: stats(),
        })
      )
        break;

      while (lo < hi) {
        const sum = a[i] + a[j] + a[lo] + a[hi];
        rec.countCompare();
        if (sum === target) {
          results.push(`${a[i]} + ${a[j]} + ${a[lo]} + ${a[hi]}`);
          if (
            !rec.push(`${a[i]} + ${a[j]} + ${a[lo]} + ${a[hi]} = ${target}. Bank it and step past duplicates.`, {
              lanes: draw(i, j, lo, hi, { [lo]: "hit", [hi]: "hit" }),
              results,
              stats: stats(sum),
              tone: "hit",
            })
          )
            break;
          lo++;
          hi--;
          while (lo < hi && a[lo] === a[lo - 1]) lo++;
          while (lo < hi && a[hi] === a[hi + 1]) hi--;
        } else if (sum < target) {
          if (
            !rec.push(`Sum ${sum} is under ${target}, so move L up.`, {
              lanes: draw(i, j, lo, hi, { [lo]: "active" }),
              results,
              stats: stats(sum),
              tone: "miss",
            })
          )
            break;
          lo++;
        } else {
          if (
            !rec.push(`Sum ${sum} is over ${target}, so move R down.`, {
              lanes: draw(i, j, lo, hi, { [hi]: "active" }),
              results,
              stats: stats(sum),
              tone: "miss",
            })
          )
            break;
          hi--;
        }
        if (rec.stopped) break;
      }
      if (rec.stopped) break;
    }
    if (rec.stopped) break;
  }

  rec.push(
    results.length > 0
      ? `${results.length} quadruplet(s), in O(n³) rather than the O(n⁴) of four nested loops.`
      : "No quadruplet sums to the target.",
    { lanes: draw(n - 1, n - 1, n - 1, n - 1), results, stats: stats(), tone: "hit" },
  );

  return rec.finish(results.length > 0 ? results.join(", ") : "none", "O(n³) after sorting");
}

/* =========================================================================
 * 4. Two sequences, one pointer each
 * ====================================================================== */

/**
 * Closest pair from two sorted arrays: one value from each, summing as close
 * to `target` as possible.
 *
 * The trick is the direction. Walk `a` upward from its smallest and `b`
 * downward from its largest, and the sum becomes a single dial that the two
 * pointers turn in opposite directions - exactly the Two Sum pass, spread
 * across two arrays.
 */
export function closestPairSteps(first: number[], second: number[], target: number): TwoPointerRun {
  const rec = createRecorder();
  const a = [...first].sort(asc);
  const b = [...second].sort(asc);
  let i = 0;
  let j = b.length - 1;
  let best = Infinity;
  let bestPair = "";

  const draw = (tones: [Record<number, CellTone>, Record<number, CellTone>] = [{}, {}]) => [
    lane("array A", a, { i }, { tones: { ...outside(a.length, i, a.length - 1), ...tones[0] } }),
    lane("array B", b, { j }, { tones: { ...outside(b.length, 0, j), ...tones[1] } }),
  ];
  const stats = (sum?: number) => [
    { label: "A[i] + B[j]", value: sum ?? "-" },
    { label: "target", value: target },
    { label: "best gap", value: best === Infinity ? "-" : best, tone: "good" as const },
  ];

  rec.push(`A is walked upward from its smallest, B downward from its largest. Target ${target}.`, {
    lanes: draw(),
    results: [],
    stats: stats(),
  });

  while (i < a.length && j >= 0) {
    const sum = a[i] + b[j];
    const gap = Math.abs(sum - target);
    rec.countCompare();
    const improved = gap < best;
    if (improved) {
      best = gap;
      bestPair = `${a[i]} + ${b[j]} = ${sum}`;
    }

    if (
      !rec.push(
        `${a[i]} + ${b[j]} = ${sum}, ${gap} from ${target}.${improved ? " Closest so far." : ""} ${
          sum < target ? "Too small: advance i in A." : sum > target ? "Too big: retreat j in B." : "Exact hit."
        }`,
        {
          lanes: draw([{ [i]: improved ? "hit" : "active" }, { [j]: improved ? "hit" : "active" }]),
          results: bestPair ? [bestPair] : [],
          stats: stats(sum),
          tone: improved ? "hit" : "miss",
        },
      )
    )
      break;

    if (sum === target) break;
    if (sum < target) i++;
    else j--;
  }

  rec.push(`Closest pair: ${bestPair}. One pass over each array, no nested loop.`, {
    lanes: draw(),
    results: bestPair ? [bestPair] : [],
    stats: stats(),
    tone: "hit",
  });

  return rec.finish(bestPair || "none", "O(n + m) after sorting");
}

/**
 * Values common to three sorted arrays.
 *
 * Three pointers, one rule: if they are not all equal, advance whichever
 * points at the smallest value. That value cannot appear in the other two
 * arrays ahead of where they already are, so nothing is lost by skipping it.
 */
export function commonInThreeSteps(first: number[], second: number[], third: number[]): TwoPointerRun {
  const rec = createRecorder();
  const a = [...first].sort(asc);
  const b = [...second].sort(asc);
  const c = [...third].sort(asc);
  const results: string[] = [];
  let i = 0;
  let j = 0;
  let k = 0;

  const draw = (tone: CellTone = "active") => [
    lane("A", a, { i }, { tones: { ...outside(a.length, i, a.length - 1), [i]: tone } }),
    lane("B", b, { j }, { tones: { ...outside(b.length, j, b.length - 1), [j]: tone } }),
    lane("C", c, { k }, { tones: { ...outside(c.length, k, c.length - 1), [k]: tone } }),
  ];

  rec.push("One pointer per array, all starting at the front.", { lanes: draw(), results });

  while (i < a.length && j < b.length && k < c.length) {
    rec.countCompare();
    if (a[i] === b[j] && b[j] === c[k]) {
      results.push(String(a[i]));
      if (
        !rec.push(`All three read ${a[i]}. Bank it, then advance all three past that value.`, {
          lanes: draw("hit"),
          results,
          tone: "hit",
        })
      )
        break;
      const v = a[i];
      while (i < a.length && a[i] === v) i++;
      while (j < b.length && b[j] === v) j++;
      while (k < c.length && c[k] === v) k++;
      continue;
    }

    const min = Math.min(a[i], b[j], c[k]);
    const which = a[i] === min ? "A" : b[j] === min ? "B" : "C";
    if (
      !rec.push(
        `${a[i]}, ${b[j]}, ${c[k]} - not all equal. ${min} is the smallest, and the other arrays are already past it, so advance ${which}.`,
        { lanes: draw(), results, tone: "miss" },
      )
    )
      break;
    if (a[i] === min) i++;
    else if (b[j] === min) j++;
    else k++;
  }

  rec.push(
    results.length > 0
      ? `Common values: ${results.join(", ")}. Every pointer moved forward only, so this is O(n + m + p).`
      : "No value appears in all three. Still one pass.",
    { lanes: draw("idle"), results, tone: "hit" },
  );

  return rec.finish(results.length > 0 ? results.join(", ") : "none", "O(n + m + p) after sorting");
}

/**
 * Policemen catch thieves: each officer can arrest one thief within `k`
 * places of them, and the goal is the maximum number of arrests.
 *
 * Two pointers over the two index lists. When the nearest officer and thief
 * are within range, pairing them is always safe: any other thief that officer
 * could reach is further along and still available to a later officer. When
 * they are out of range, whichever comes first can never be matched at all,
 * so it is dropped.
 */
export function policeThievesSteps(cells: string[], k: number): TwoPointerRun {
  const rec = createRecorder();
  const police: number[] = [];
  const thieves: number[] = [];
  cells.forEach((c, idx) => {
    if (c === "P") police.push(idx);
    else if (c === "T") thieves.push(idx);
  });

  const results: string[] = [];
  let p = 0;
  let t = 0;
  const caught: Record<number, CellTone> = {};

  const draw = (tones: Record<number, CellTone> = {}) => [
    lane("street", cells, {
      ...(p < police.length ? { P: police[p] } : {}),
      ...(t < thieves.length ? { T: thieves[t] } : {}),
    }, { tones: { ...caught, ...tones } }),
  ];
  const stats = () => [
    { label: "range k", value: k },
    { label: "arrests", value: results.length, tone: "good" as const },
  ];

  rec.push(`One pointer walks the police, another walks the thieves. An officer can reach ${k} place(s) either way.`, {
    lanes: draw(),
    results,
    stats: stats(),
  });

  while (p < police.length && t < thieves.length) {
    const dist = Math.abs(police[p] - thieves[t]);
    rec.countCompare();

    if (dist <= k) {
      results.push(`P@${police[p]} → T@${thieves[t]}`);
      caught[police[p]] = "kept";
      caught[thieves[t]] = "kept";
      if (
        !rec.push(
          `Officer at ${police[p]} and thief at ${thieves[t]} are ${dist} apart, within ${k}. Arrest, and advance both.`,
          { lanes: draw({ [police[p]]: "hit", [thieves[t]]: "hit" }), results, stats: stats(), tone: "hit" },
        )
      )
        break;
      p++;
      t++;
    } else if (police[p] < thieves[t]) {
      if (
        !rec.push(
          `Officer at ${police[p]} is ${dist} away, out of range, and every later thief is further still. That officer catches nobody.`,
          { lanes: draw({ [police[p]]: "dropped" }), results, stats: stats(), tone: "miss" },
        )
      )
        break;
      caught[police[p]] = "dropped";
      p++;
    } else {
      if (
        !rec.push(
          `Thief at ${thieves[t]} is ${dist} away from the nearest remaining officer, and later officers are further still. That thief escapes.`,
          { lanes: draw({ [thieves[t]]: "dropped" }), results, stats: stats(), tone: "miss" },
        )
      )
        break;
      caught[thieves[t]] = "dropped";
      t++;
    }
  }

  rec.push(`${results.length} arrest(s), in one pass over each list.`, {
    lanes: draw(),
    results,
    stats: stats(),
    tone: "hit",
  });

  return rec.finish(`${results.length} arrests`, "O(n) after collecting the indices");
}

/**
 * The celebrity problem: someone everybody knows and who knows nobody.
 *
 * Two pointers from the ends of the guest list, and a single question at each
 * step. "Does i know j?" always eliminates someone: if yes, i knows somebody
 * so i is not the celebrity; if no, j is not known by everybody so j is not
 * the celebrity. n-1 questions leave one candidate, which then needs
 * verifying - the elimination pass proves who it *cannot* be, never who it is.
 */
export function celebritySteps(knows: boolean[][], names: string[]): TwoPointerRun {
  const rec = createRecorder();
  const n = names.length;
  const eliminated: Record<number, CellTone> = {};
  let lo = 0;
  let hi = n - 1;

  const draw = (query?: [number, number], tones: Record<number, CellTone> = {}) => ({
    lanes: [lane("guests", names, { i: lo, j: hi }, { tones: { ...eliminated, ...tones } })],
    matrix: { labels: names, rows: knows, query },
  });

  rec.push("Two pointers on the guest list. Each question knocks exactly one person out.", {
    ...draw(),
    results: [],
  });

  while (lo < hi) {
    rec.countCompare();
    const q: [number, number] = [lo, hi];
    if (knows[lo][hi]) {
      if (
        !rec.push(
          `Does ${names[lo]} know ${names[hi]}? Yes - so ${names[lo]} knows somebody, and a celebrity knows nobody. ${names[lo]} is out.`,
          { ...draw(q, { [lo]: "dropped" }), results: [], tone: "miss" },
        )
      )
        break;
      eliminated[lo] = "dropped";
      lo++;
    } else {
      if (
        !rec.push(
          `Does ${names[lo]} know ${names[hi]}? No - so ${names[hi]} is not known by everybody. ${names[hi]} is out.`,
          { ...draw(q, { [hi]: "dropped" }), results: [], tone: "miss" },
        )
      )
        break;
      eliminated[hi] = "dropped";
      hi--;
    }
  }

  const candidate = lo;
  rec.push(
    `${n - 1} questions, one survivor: ${names[candidate]}. That only proves nobody else can be the celebrity, so now verify.`,
    { ...draw(undefined, { [candidate]: "active" }), results: [names[candidate]] },
  );

  let valid = true;
  for (let other = 0; other < n && valid; other++) {
    if (other === candidate) continue;
    rec.countCompare(2);
    const knowsOut = knows[candidate][other];
    const knownBy = knows[other][candidate];
    if (knowsOut || !knownBy) {
      valid = false;
      rec.push(
        knowsOut
          ? `Verification fails: ${names[candidate]} knows ${names[other]}, so there is no celebrity here.`
          : `Verification fails: ${names[other]} does not know ${names[candidate]}, so there is no celebrity here.`,
        { ...draw([candidate, other], { [candidate]: "dropped" }), results: [], tone: "miss" },
      );
      break;
    }
    if (
      !rec.push(
        `${names[candidate]} does not know ${names[other]}, and ${names[other]} knows ${names[candidate]}. Still consistent.`,
        { ...draw([candidate, other], { [candidate]: "kept" }), results: [names[candidate]], tone: "hit" },
      )
    )
      break;
  }

  if (valid) {
    rec.push(
      `${names[candidate]} is the celebrity. ${n - 1} elimination questions plus 2(n-1) verification questions, so O(n) - against O(n²) for asking everybody about everybody.`,
      { ...draw(undefined, { [candidate]: "kept" }), results: [names[candidate]], tone: "hit" },
    );
  }

  return rec.finish(valid ? `${names[candidate]} is the celebrity` : "no celebrity", "O(n) questions");
}
