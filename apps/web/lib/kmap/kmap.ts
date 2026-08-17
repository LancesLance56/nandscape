/**
 * Karnaugh map geometry and grouping.
 *
 * The one idea everything here rests on: a K-map is a torus, not a
 * rectangle. Gray-code ordering means the last column is adjacent to the
 * first and the last row is adjacent to the first, so a "rectangle" of cells
 * can wrap around either edge (the four-corners group being the famous
 * case). Every function below treats the grid as cyclic rather than
 * special-casing wraparound, which is also what makes the drawing code able
 * to outline a wrapped group properly instead of tinting loose cells.
 */

/** 0, 1, or a don't-care. Don't-cares may be covered but need not be. */
export type CellValue = 0 | 1 | "x";

export interface KMapSpec {
  /** Most significant variable first. 2 to 4 of them. */
  variables: string[];
  /** One entry per minterm, indexed by the minterm number. */
  cells: CellValue[];
}

/**
 * A cube in the Boolean space: `bits` holds the value of the fixed
 * variables, `mask` marks which bit positions were eliminated. Bit position
 * p corresponds to variable index `variables.length - 1 - p`, so position 0
 * is the last (least significant) variable.
 */
export interface Implicant {
  bits: number;
  mask: number;
}

export const MIN_VARS = 2;
export const MAX_VARS = 4;

export function isCellValue(v: unknown): v is CellValue {
  return v === 0 || v === 1 || v === "x";
}

/** Cells for `n` variables, all zero. */
export function emptyCells(varCount: number): CellValue[] {
  return new Array(1 << varCount).fill(0) as CellValue[];
}

/** Gray code sequence for `bits` bits: 0, 1, 3, 2 for two bits. */
export function grayCode(bits: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 1 << bits; i++) out.push(i ^ (i >> 1));
  return out;
}

export function toBinary(value: number, bits: number): string {
  return value.toString(2).padStart(bits, "0");
}

/**
 * How the variables split across the two axes. Rows take the high-order
 * half, columns the rest, matching the conventional textbook layout: 2x2 for
 * two variables, 2 rows by 4 columns for three, 4x4 for four.
 */
export interface KMapLayout {
  varCount: number;
  rowBits: number;
  colBits: number;
  rowVars: string[];
  colVars: string[];
  /** Gray-code value for each row index, top to bottom. */
  rowCodes: number[];
  /** Gray-code value for each column index, left to right. */
  colCodes: number[];
  rows: number;
  cols: number;
}

export function layoutFor(variables: string[]): KMapLayout {
  const varCount = variables.length;
  const rowBits = Math.floor(varCount / 2);
  const colBits = varCount - rowBits;
  return {
    varCount,
    rowBits,
    colBits,
    rowVars: variables.slice(0, rowBits),
    colVars: variables.slice(rowBits),
    rowCodes: grayCode(rowBits),
    colCodes: grayCode(colBits),
    rows: 1 << rowBits,
    cols: 1 << colBits,
  };
}

/** The minterm sitting at a grid position. */
export function mintermAt(layout: KMapLayout, row: number, col: number): number {
  return (layout.rowCodes[row] << layout.colBits) | layout.colCodes[col];
}

/** Where a minterm sits on the grid. */
export function positionOf(layout: KMapLayout, minterm: number): { row: number; col: number } {
  const rowCode = minterm >> layout.colBits;
  const colCode = minterm & ((1 << layout.colBits) - 1);
  return {
    row: layout.rowCodes.indexOf(rowCode),
    col: layout.colCodes.indexOf(colCode),
  };
}

/** Every minterm an implicant covers. */
export function mintermsOf(imp: Implicant, varCount: number): number[] {
  const freePositions: number[] = [];
  for (let p = 0; p < varCount; p++) if (imp.mask & (1 << p)) freePositions.push(p);

  const out: number[] = [];
  for (let combo = 0; combo < 1 << freePositions.length; combo++) {
    let value = imp.bits & ~imp.mask;
    freePositions.forEach((p, i) => {
      if (combo & (1 << i)) value |= 1 << p;
    });
    out.push(value);
  }
  return out.sort((a, b) => a - b);
}

/** How many variables an implicant actually mentions. */
export function literalCount(imp: Implicant, varCount: number): number {
  let count = 0;
  for (let p = 0; p < varCount; p++) if (!(imp.mask & (1 << p))) count++;
  return count;
}

/**
 * The product term, e.g. `AB'`. An implicant with every variable eliminated
 * is the constant 1, which is what a fully-covered map reduces to.
 */
export function termFor(imp: Implicant, variables: string[]): string {
  const varCount = variables.length;
  const parts: string[] = [];
  // Position varCount-1 is the first (most significant) variable, so walking
  // downward emits the literals in the order a reader expects: A before B.
  for (let p = varCount - 1; p >= 0; p--) {
    if (imp.mask & (1 << p)) continue;
    const name = variables[varCount - 1 - p];
    parts.push((imp.bits >> p) & 1 ? name : `${name}'`);
  }
  return parts.length === 0 ? "1" : parts.join("");
}

/** Format a whole cover as a sum-of-products expression. */
export function sopExpression(cover: Implicant[], variables: string[]): string {
  if (cover.length === 0) return "0";
  if (cover.some((imp) => literalCount(imp, variables.length) === 0)) return "1";
  return cover.map((imp) => termFor(imp, variables)).join(" + ");
}

/**
 * Turn an arbitrary set of selected cells into an implicant, or null when
 * the selection is not a legal K-map group.
 *
 * A legal group is a power-of-two count of cells forming a cube: every
 * combination of the varying bits must be present, and no other cell. That
 * single check subsumes "rectangular", "power of two" and the wraparound
 * rules all at once, because gray-code adjacency is exactly bit adjacency.
 */
export function implicantFromCells(cells: number[], varCount: number): Implicant | null {
  if (cells.length === 0) return null;
  if ((cells.length & (cells.length - 1)) !== 0) return null;

  const base = cells[0];
  let mask = 0;
  for (const c of cells) mask |= c ^ base;

  let freeBits = 0;
  for (let p = 0; p < varCount; p++) if (mask & (1 << p)) freeBits++;
  if (1 << freeBits !== cells.length) return null;

  const imp: Implicant = { bits: base & ~mask, mask };
  const expected = mintermsOf(imp, varCount);
  const set = new Set(cells);
  if (expected.length !== set.size) return null;
  return expected.every((m) => set.has(m)) ? imp : null;
}

export function implicantKey(imp: Implicant): string {
  return `${imp.bits}:${imp.mask}`;
}

export function sameImplicant(a: Implicant, b: Implicant): boolean {
  return a.bits === b.bits && a.mask === b.mask;
}

/* -------------------------------------------------------------------------
 * Drawing geometry
 * ---------------------------------------------------------------------- */

export interface GridRect {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

/**
 * Maximal runs of consecutive indices on a cyclic axis.
 *
 * The cyclic part is what makes wrapped groups drawable: on a 4-wide axis,
 * columns {3, 0} is one run starting at 3 with length 2, not two separate
 * single-column runs. A group covering the whole axis returns one full-width
 * run rather than a wrapped one that would render as a seam.
 */
export function cyclicRuns(indices: number[], total: number): { start: number; length: number }[] {
  const present = new Set(indices);
  if (present.size === 0) return [];
  if (present.size === total) return [{ start: 0, length: total }];

  const runs: { start: number; length: number }[] = [];
  for (let i = 0; i < total; i++) {
    // A run starts where the previous index is absent.
    if (!present.has(i)) continue;
    const prev = (i - 1 + total) % total;
    if (present.has(prev)) continue;

    let length = 0;
    let cursor = i;
    while (present.has(cursor) && length < total) {
      length++;
      cursor = (cursor + 1) % total;
    }
    runs.push({ start: i, length });
  }
  return runs;
}

/**
 * Split a cyclic run into pieces that do not run off the end of the axis.
 *
 * A run is cyclic, so rows {3, 0} on a 4-row grid is one logical run
 * starting at 3 with length 2. That is the right way to reason about it, but
 * it cannot be drawn as a single rectangle: on screen it is two separate
 * bands, one at the bottom edge and one at the top. Everything downstream
 * draws rectangles, so the wrap is resolved here rather than in the renderer.
 */
function screenSegments(run: { start: number; length: number }, total: number): { start: number; length: number }[] {
  if (run.start + run.length <= total) return [run];
  const head = total - run.start;
  return [
    { start: run.start, length: head },
    { start: 0, length: run.length - head },
  ];
}

/**
 * The rectangles needed to draw an implicant, in screen space: none of them
 * wrap, so each can be rendered as a plain rounded rect. A group wrapping
 * one axis yields two pieces, and the four-corners group yields four.
 */
export function rectsForImplicant(imp: Implicant, layout: KMapLayout): GridRect[] {
  const cells = mintermsOf(imp, layout.varCount);
  const rowSet = new Set<number>();
  const colSet = new Set<number>();
  for (const m of cells) {
    const { row, col } = positionOf(layout, m);
    rowSet.add(row);
    colSet.add(col);
  }

  const rowRuns = cyclicRuns([...rowSet], layout.rows).flatMap((r) => screenSegments(r, layout.rows));
  const colRuns = cyclicRuns([...colSet], layout.cols).flatMap((c) => screenSegments(c, layout.cols));

  const rects: GridRect[] = [];
  for (const r of rowRuns) {
    for (const c of colRuns) {
      rects.push({ row: r.start, col: c.start, rowSpan: r.length, colSpan: c.length });
    }
  }
  return rects;
}

/** True when the implicant is drawn in more than one piece. */
export function wrapsAround(imp: Implicant, layout: KMapLayout): boolean {
  return rectsForImplicant(imp, layout).length > 1;
}

/* -------------------------------------------------------------------------
 * Truth-table helpers
 * ---------------------------------------------------------------------- */

export function mintermsWhere(cells: CellValue[], want: CellValue): number[] {
  const out: number[] = [];
  cells.forEach((v, i) => {
    if (v === want) out.push(i);
  });
  return out;
}

/** Does this cover reproduce the truth table exactly (don't-cares free)? */
export function coverMatchesTable(cover: Implicant[], cells: CellValue[], varCount: number): boolean {
  const covered = new Set<number>();
  for (const imp of cover) for (const m of mintermsOf(imp, varCount)) covered.add(m);

  for (let m = 0; m < cells.length; m++) {
    if (cells[m] === 1 && !covered.has(m)) return false;
    if (cells[m] === 0 && covered.has(m)) return false;
  }
  return true;
}

/** Evaluate a cover at one input assignment. */
export function evaluateCover(cover: Implicant[], minterm: number): boolean {
  return cover.some((imp) => (minterm & ~imp.mask) === (imp.bits & ~imp.mask));
}

/** Canonical sum-of-minterms, the unsimplified starting point. */
export function canonicalSop(cells: CellValue[], variables: string[]): string {
  const ones = mintermsWhere(cells, 1);
  if (ones.length === 0) return "0";
  const varCount = variables.length;
  return ones.map((m) => termFor({ bits: m, mask: 0 }, variables)).join(" + ") || String(varCount);
}
