# @nandscape/engine

A standalone, **logic-only** digital circuit simulation engine for nandscape.
No UI, no rendering, no DOM — just a data-oriented, event-driven, graph-based
gate-level simulator you can drive headlessly (as the test suite does) or
wrap with a UI layer elsewhere in `nandscape/apps`.

## Design pillars

1. **Data-Oriented Design (DOD).** Circuit structure and simulation state are
   stored as Structure-of-Arrays (SoA) tables backed by TypedArrays, not as
   a graph of individual gate/pin/net objects. See `src/data/`.
2. **Event-driven simulation**, not fixed-timestep. Work only ever happens
   in response to an actual signal change, scheduled on a binary min-heap
   priority queue ordered by simulation time. See `src/data/event-queue.ts`
   and `src/simulation/simulator.ts`.
3. **Graph-based evaluation.** A compiled, CSR (Compressed Sparse Row)
   adjacency graph maps each net directly to the gates that structurally
   depend on it, so propagation only ever touches what's actually affected —
   never the whole circuit. See `src/data/topology.ts` and
   `src/simulation/compiler.ts`.
4. **4-value logic**, not a boolean on/off model: `LOW`, `HIGH`, `FLOAT`
   (high-impedance/undriven), `UNKNOWN` (contention/uninitialized/X). This is
   threaded through every data structure and every gate truth table so the
   engine can represent tri-state buses, uninitialized registers, and bus
   contention correctly — not just "is it on."

## Folder structure

```
src/
  data/                   Data-Oriented Design storage — pure structure/state, no behavior beyond trivial accessors
    types.ts              Enums & branded ids: SignalState, GateType, PinDirection, EdgeType, ...
    constants.ts          Default gate delays, capacity hints, safety limits
    dynamic-array.ts       Generic growable TypedArray column (the SoA building block)
    circuit.ts             Static netlist: SoA gate/pin/net tables + construction API
    topology.ts             Derived CSR dependency graph (net -> driver pins, net -> fanout gates)
    event-queue.ts          SoA binary min-heap priority queue of scheduled events
    runtime-state.ts        Mutable per-simulation-run state (kept separate from static structure)
    index.ts                 Barrel export

  simulation/              Algorithms — everything that operates ON the data above
    gate-evaluators.ts       Pure functions: gate truth tables + net driver resolution (no mutable state)
    compiler.ts               CircuitData -> CircuitTopology (validates + builds the CSR graph)
    simulator.ts               The event-driven Simulator: delta-cycle processing loop
    builder.ts                  Ergonomic circuit-construction helpers (createNand, createDFlipFlop, ...)
    index.ts                    Barrel export
    tests/                       Test suite (Node's built-in test runner, zero external dependencies)
      gate-evaluators.test.ts    Pure-function unit tests (truth tables, net resolution)
      circuit-builder.test.ts     CircuitData + compiler tests
      event-queue.test.ts          Priority queue correctness tests
      simulator.test.ts             End-to-end behavioral tests (see below)

  index.ts                  Public package entry point
```

## What's simulated

Combinational primitives: `NAND`, `AND`, `OR`, `NOR`, `XOR`, `XNOR`, `NOT`,
`BUFFER`, `TRISTATE_BUFFER` (variable arity where applicable).

Sequential primitives: `D_LATCH` (transparent/level-sensitive), `D_FLIP_FLOP`
(edge-triggered, with async reset/set), `SR_LATCH` (NOR-based or NAND-based,
with correct forbidden-state handling).

Circuit boundary / source components: `INPUT_PIN`, `OUTPUT_PIN`, `CONSTANT`,
`CLOCK` (free-running, configurable half-period).

Hierarchy: a `SUBCIRCUIT` gate type is reserved in the data model but
evaluation is intentionally left unimplemented in this version (flatten
hierarchical designs before compiling, or extend `Simulator.evaluateGate()`
to recurse into a nested simulation).

## How the simulation algorithm works

The event queue holds a single event shape: "pin P should begin driving
value V at time T." Processing happens in delta cycles:

1. Pop every event sharing the earliest scheduled time as one batch.
2. Apply each non-stale event (see the generation-counter note below).
   A `CLOCK` source re-schedules its own next toggle here.
3. Re-resolve every net touched by an applied event from its *active*
   driver pins only (O(driver count) via the CSR graph — not a full scan).
   Record which nets actually changed value.
4. Collect the deduplicated union of fanout gates across every changed net
   (O(fanout count) per net via the CSR graph) — this is the graph-based
   part: only gates that structurally depend on a changed net are ever
   touched.
5. Evaluate each such gate once against the now-settled net states. If a
   gate's computed output differs from what it's currently driving,
   schedule a new event at `time + gate.delay`.
6. Repeat until the queue drains or a safety limit (`maxEvents`/`maxTime`)
   is hit.

### Two scheduling regimes, and why they're kept separate

- **Internally-derived events** (steps 4–5 above): when a gate re-evaluates
  and decides on a new output before its previously-scheduled output has
  fired, the old event is stale and must be discarded — a gate's output is
  a pure function of its current inputs, so a newer decision supersedes an
  older one. This is done with a per-pin **generation counter**: each new
  internally-scheduled event captures the pin's generation at schedule
  time, and a popped event is discarded if the pin's generation has since
  moved on (classic lazy-deletion / decrease-key emulation on a plain
  binary heap — see `data/event-queue.ts` for the full rationale).
- **Externally-authored events** (`Simulator.setInput()`, and source-gate
  seeding for `CONSTANT`/`CLOCK`/initial sequential-element state): a
  testbench legitimately pre-programs a whole sequence of distinct future
  events on the same pin (e.g. "go HIGH at t=0, then FLOAT at t=9"), and
  each one must fire at its own time regardless of how many later calls
  were made in the meantime. These are tagged with a sentinel generation
  (`EXTERNAL_GENERATION`) that bypasses the staleness check entirely, so
  scheduling a later stimulus event never retroactively invalidates an
  earlier, still-pending one.

## Running the tests

No external test framework — Node's built-in test runner (`node:test` +
`node:assert/strict`) via `tsx` for TypeScript support, so `npm install`
only ever needs `tsx`, `typescript`, and `@types/node`.

```bash
npm install
npm test          # runs src/simulation/tests/*.test.ts
npm run typecheck # tsc --noEmit
```

65 tests across 4 files, covering:

- **gate-evaluators.test.ts** — every combinational/sequential truth table
  across the full 4-value domain (including dominant-zero/dominant-one
  rules, UNKNOWN propagation, tri-state enable logic, D-latch/D-flip-flop/
  SR-latch behavior including forbidden states), plus net driver
  resolution (undriven, single-driver, agreement, contention).
- **circuit-builder.test.ts** — CircuitData construction invariants and the
  netlist -> CSR topology compiler, including fanout deduplication and
  multi-driver (bus) net detection.
- **event-queue.test.ts** — heap ordering correctness (including growth
  beyond initial capacity), FIFO tie-breaking, and delta-cycle batch
  extraction.
- **simulator.test.ts** — end-to-end behavior: a 2-input NAND truth table
  driven through the full event pipeline, propagation-delay ordering
  through a gate chain, a composed half-adder (XOR + AND) verified across
  all four input combinations, a primitive SR latch AND a from-scratch
  cross-coupled-NAND SR latch (bistability, active-low set/reset), a
  tri-state bus with contention detection, a free-running clock, D-latch
  transparency, D-flip-flop edge-triggered capture (including ignoring
  changes between edges and asynchronous reset), a self-oscillating
  odd-length inverter ring (genuine combinational feedback, bounded by the
  simulator's safety limits), and repeatable `reset()`-and-rerun semantics.

## Example usage

```ts
import { CircuitData } from './src/data/circuit';
import { compileTopology } from './src/simulation/compiler';
import { Simulator } from './src/simulation/simulator';
import { createInput, createOutput, createNand } from './src/simulation/builder';
import { SignalState } from './src/data/types';

const circuit = new CircuitData();
const a = createInput(circuit, 'A');
const b = createInput(circuit, 'B');
const nand = createNand(circuit, 2);
const y = createOutput(circuit, 'Y');

circuit.wire([a.output, nand.inputs[0]]);
circuit.wire([b.output, nand.inputs[1]]);
circuit.wire([nand.output, y.input]);

const topology = compileTopology(circuit);
const sim = new Simulator(circuit, topology);

sim.setInput(a.gate, SignalState.HIGH, 0);
sim.setInput(b.gate, SignalState.HIGH, 0);
sim.run();

console.log(SignalState[sim.readOutput(y.gate)]); // "LOW"
```
