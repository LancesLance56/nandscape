/**
 * src/index.ts
 * ---------------------------------------------------------------------------
 * Public entry point for @nandscape/engine.
 *
 * This package is a standalone, logic-only circuit simulation engine:
 *   - src/data        — Data-Oriented Design storage: SoA tables for gates,
 *                        pins, nets, the derived CSR dependency graph, the
 *                        event queue, and mutable runtime state.
 *   - src/simulation   — Algorithms: pure gate truth-table evaluation, the
 *                        netlist compiler, the event-driven simulator, and
 *                        ergonomic circuit-construction helpers.
 *
 * There is intentionally NO UI, rendering, or presentation code anywhere in
 * this package — it is meant to be driven headlessly (as this test suite
 * does) or wrapped by a separate UI layer elsewhere in nandscape/apps.
 */

export * from './data';
export * from './simulation';
