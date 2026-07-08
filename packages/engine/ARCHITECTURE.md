# `@nandscape/engine` — Architecture & Algorithm Guide

This document explains **how the engine works**, in plain language, for
humans reading it for the first time. If the inline code comments are the
"what and why at the point of use," this document is the map that ties
everything together: why the engine is shaped the way it is, how the pieces
fit, and step by step, what actually happens when you call `sim.run()`.

It assumes no prior familiarity with the codebase, but does assume you know
roughly what a logic gate is.

---

## Table of contents

1. [The big idea](#1-the-big-idea)
2. [Why 4 signal states instead of 2](#2-why-4-signal-states-instead-of-2)
3. [Why Data-Oriented Design](#3-why-data-oriented-design)
4. [The data layer, piece by piece](#4-the-data-layer-piece-by-piece)
5. [The simulation layer, piece by piece](#5-the-simulation-layer-piece-by-piece)
6. [The simulation algorithm, step by step](#6-the-simulation-algorithm-step-by-step)
7. [Worked example: simulating a single NAND gate](#7-worked-example-simulating-a-single-nand-gate)
8. [Two scheduling regimes: derived vs. authored events](#8-two-scheduling-regimes-derived-vs-authored-events)
9. [Sequential elements: how "memory" works with no memory array](#9-sequential-elements-how-memory-works-with-no-memory-array)
10. [Safety valves: stopping a simulation that never settles](#10-safety-valves-stopping-a-simulation-that-never-settles)
11. [Subcircuits: composing reusable blocks by flattening](#11-subcircuits-composing-reusable-blocks-by-flattening)
12. [Glossary](#12-glossary)

---

## 1. The big idea

A circuit simulator's job is: given a network of gates wired together, and
some inputs, figure out what every wire in the circuit is doing *over time*
— not just in some final steady state, but respecting the fact that real
gates take time to react (propagation delay), and that changes ripple
through a circuit in a specific order.

There are two broad ways to build one:

- **Fixed-timestep ("clocked") simulation.** Advance time by a small fixed
  step, re-evaluate *every* gate at every step, repeat. Simple to write,
  but wasteful — most gates aren't doing anything most of the time — and it
  doesn't scale to large circuits or long time horizons.
- **Event-driven simulation.** Only ever do work in response to an actual
  change. If nothing changed, nothing gets re-evaluated. This is how real
  HDL simulators (Verilog, VHDL) work, and it's what this engine does.

Event-driven simulation on its own isn't enough, though — you still need to
know, cheaply, *which* gates might care about a given change. That's where
being **graph-based** comes in: the engine precompiles the circuit into a
dependency graph (which gates read which nets), so that when a net changes,
finding "who needs to know" is a direct lookup, not a search.

So, in one sentence: **the engine schedules signal changes on a
time-ordered priority queue, and when a change is applied, it uses a
precompiled dependency graph to find and re-evaluate exactly the gates that
depend on it — nothing more.**

---

## 2. Why 4 signal states instead of 2

A beginner circuit simulator often models a wire as just `true`/`false`.
Real digital circuits need more than that, and so does this engine.
`SignalState` has four values:

| State     | Meaning                                                              |
|-----------|-----------------------------------------------------------------------|
| `LOW`     | Actively driven logic 0                                              |
| `HIGH`    | Actively driven logic 1                                              |
| `FLOAT`   | High-impedance / **not being driven by anything right now** (Z)      |
| `UNKNOWN` | Indeterminate — contention, uninitialized memory, or an X-tainted result (X) |

Why each one matters:

- **`FLOAT`** exists because not every wire is always driven. A tri-state
  bus (used e.g. to let multiple chips share one set of wires) has buffers
  that can disconnect themselves entirely. A net with *zero* active drivers
  isn't "0" or "1" — it's floating, and in real hardware its voltage is
  undefined (or held by a weak pull resistor, which this engine doesn't
  model). Without `FLOAT`, you can't represent "nothing is driving this
  wire right now" at all.
- **`UNKNOWN`** exists for two reasons. First, **contention**: if two
  outputs both actively drive the same wire to *different* values at the
  same time, that's a real hardware fault (a "bus fight"), and the honest
  answer for what voltage results is "we don't know, and it might even
  damage the chips." Second, **uninitialized state**: a flip-flop that has
  never been clocked, or a register that hasn't been reset, holds a value
  no one has ever set. Claiming it's `LOW` would be a lie — plenty of real
  bugs come from *assuming* power-on state, and this engine won't paper
  over that.

Every gate's truth table, and the logic that resolves what a wire's actual
value is, is defined over all four states — not bolted on as a special
case. See [`gate-evaluators.ts`](../src/simulation/gate-evaluators.ts) for
the exact rules (summarized in [§5.1](#51-gate-evaluatorsts--pure-truth-tables)
below).

---

## 3. Why Data-Oriented Design

The "obvious" way to model a circuit in an object-oriented language is one
object per gate, each holding references to its input/output pin objects,
each pin holding a reference to the net object it's connected to, and so
on — a graph of small objects connected by pointers.

This engine deliberately does **not** do that. Instead, gates, pins, and
nets are each represented as a table (in the database sense): all the
gates' *types* live in one flat array, all their *delays* live in another
flat array, all their *pin ranges* in another, etc. — instead of `Gate`
objects each holding a `type`, `delay`, `pins` field. This is called
**Structure of Arrays (SoA)**, as opposed to the more familiar **Array of
Structures (AoS)**.

```
AoS (the "obvious" way):        SoA (what this engine does):

gates = [                        gateType     = [NAND, NOT, AND, ...]
  { type: NAND, delay: 1, ... }, gateDelay    = [1,    1,   2,   ...]
  { type: NOT,  delay: 1, ... }, gatePinStart = [0,    3,   5,   ...]
  { type: AND,  delay: 2, ... }, gatePinCount = [3,    2,   3,   ...]
  ...                            ...
]
```

Why this matters here, concretely:

- **Cache locality.** When the simulator needs to check every gate's delay,
  or scan a net's driver pins, it's reading one tightly-packed, contiguous
  block of memory (a `TypedArray`) instead of chasing pointers to
  scattered objects. This is the difference between reading a spreadsheet
  column and reading a linked list — and it's the whole reason SoA layouts
  are the standard approach in performance-sensitive simulation, game
  engines, and numerical computing.
- **No per-gate object/GC overhead.** A circuit with 100,000 gates in AoS
  form is 100,000+ heap-allocated objects (plus their pin and net objects).
  In SoA form it's a handful of large, flat arrays. This matters a lot for
  a simulator that might schedule millions of events over a long run.
- **Separation of "what never changes" from "what changes every tick."**
  This is the deeper architectural payoff, and it's why the engine is split
  into three distinct kinds of storage (see [§4](#4-the-data-layer-piece-by-piece)):
  the circuit's *structure* (which gates exist, how they're wired), the
  *derived* dependency graph, and the *mutable runtime state* of one
  simulation run, are all separate objects. You can compile a circuit's
  structure once and then run it — reset it — run it again, many times,
  without ever re-deriving the structure or the dependency graph. This
  would be much messier if "is this gate's Q output currently HIGH" lived
  on the same object as "what type of gate is this."

None of this changes *what* the simulator computes — it changes how fast
and how scalably it computes it, and it's a deliberate response to the
prompt's ask for "the most optimal algorithm," not decoration.

---

## 4. The data layer, piece by piece

Everything in `src/data/` is **pure storage** — structures and small
read/write accessors, with no simulation logic. If you deleted the entire
`src/simulation/` folder, `src/data/` would still make complete sense on
its own as "here is how a circuit and a simulation's state are
represented."

### 4.1 `types.ts` — the vocabulary

Defines the enums and identifier types every other file speaks in:

- **`SignalState`** — the 4-value logic model described in [§2](#2-why-4-signal-states-instead-of-2).
- **`GateType`** — every kind of component the engine understands:
  combinational primitives (`NAND`, `AND`, `OR`, `NOR`, `XOR`, `XNOR`,
  `NOT`, `BUFFER`, `TRISTATE_BUFFER`), sequential primitives (`D_LATCH`,
  `D_FLIP_FLOP`, `SR_LATCH`), and circuit-boundary components (`INPUT_PIN`,
  `OUTPUT_PIN`, `CONSTANT`, `CLOCK`). There is no `SUBCIRCUIT` gate type —
  hierarchical designs are handled at construction time, before any of
  these types come into play — see [§11](#11-subcircuits-composing-reusable-blocks-by-flattening).
- **`PinDirection`** — `INPUT` (reads a net, never drives it), `OUTPUT`
  (drives a net, never reads it), `INOUT` (tri-state capable — may drive or
  release to float).
- **`EdgeType`** — `RISING`, `FALLING`, `ANY`, `NONE`, used to configure
  which clock transition a flip-flop reacts to.
- **`GateId` / `PinId` / `NetId`** — these are **branded numbers**: at
  runtime they're just plain integers (array indices), but the type
  checker treats a `GateId` and a `NetId` as incompatible types even
  though both are `number` underneath. This catches an entire class of
  "passed the wrong kind of id" bugs at compile time, for zero runtime
  cost — no wrapper objects, no boxing.

### 4.2 `dynamic-array.ts` — the SoA building block

A `DynamicTypedArray<T>` is a growable column backed by a real
`TypedArray` (`Int32Array`, etc.) — basically a `std::vector<int32_t>` or
Java `ArrayList<Integer>`, but backed by packed native memory instead of
boxed values. Every SoA table in the engine (the gate table, the pin
table, ...) is built out of several of these columns living side by side.
It grows by re-allocating a bigger buffer and copying over the old data —
amortized O(1) per append, same as any growable array.

### 4.3 `circuit.ts` — the netlist

This is the **static structural description** of a circuit — the
"netlist," in hardware-design terminology. Think of it as the file you'd
save to disk: what gates exist, what pins they have, and how those pins
are wired together via nets. It is a `CircuitData` object holding three
SoA tables:

**Gate table** (indexed by `GateId`):

| Column          | Meaning                                                        |
|-----------------|-----------------------------------------------------------------|
| `gateType`      | Which `GateType` this is                                        |
| `gateDelay`     | Propagation delay (in simulation time units)                    |
| `gatePinStart`  | Index into the pin table where this gate's pins begin           |
| `gatePinCount`  | How many pins this gate owns                                    |
| `gateParamA/B`  | Gate-specific numeric config (e.g. a `CLOCK`'s half-period, an `SR_LATCH`'s NOR-vs-NAND flavor) |
| `gateName`      | Optional debug label (metadata only — never read by the simulator) |

**Pin table** (indexed by `PinId`) — every gate's pins are allocated as a
*contiguous* block, which is what lets `gatePinStart`/`gatePinCount`
address a gate's pins as a simple range instead of needing a separate
list:

| Column         | Meaning                                              |
|----------------|--------------------------------------------------------|
| `pinDirection` | `INPUT` / `OUTPUT` / `INOUT`                            |
| `pinNet`       | Which net this pin connects to (or "unconnected")        |
| `pinOwnerGate` | Which gate this pin belongs to                            |
| `pinRole`      | This pin's index within its owning gate (e.g. "input 0," "enable," "Q") |

**Net table** (indexed by `NetId`) — deliberately minimal. A net doesn't
need to store much of anything structural; which pins connect to it is
*derived* later (see [§4.4](#44-topologyts--the-derived-dependency-graph)),
because that's data every net needs but that's cheaper to compute once in
bulk than to maintain incrementally as pins are wired up one at a time.

`CircuitData` also exposes the **construction API** you actually use to
build a circuit — `addGate()`, `addNet()`, `connect()`, `wire()` (connect
several pins to one new net in one call), `mergeNets()` (join two
already-wired nets — see [§11](#11-subcircuits-composing-reusable-blocks-by-flattening)),
`pinOf(gate, role)` — as regular methods on this one object. This might
look "not very DOD" at first glance (isn't DOD supposed to avoid methods
on objects?) but it isn't: DOD is about *how bulk data is laid out and
iterated*, not about banning all methods. There is exactly **one**
`CircuitData` object per circuit, managing arrays that describe *every*
gate/pin/net — that's the SoA pattern working correctly, as opposed to one
object *per gate*.

Hierarchical designs (a reusable block instantiated multiple times inside
a larger circuit) are handled entirely at this layer, by cloning one
`CircuitData`'s gates and nets into another's — see
[§11](#11-subcircuits-composing-reusable-blocks-by-flattening). There is
no dedicated `GateType` for this; by the time a circuit reaches
`compileTopology()`, an instantiated subcircuit is indistinguishable from
gates that were hand-wired directly.

### 4.4 `topology.ts` — the derived dependency graph

This is the piece that makes the engine "graph-based." Given a compiled
circuit, two questions come up constantly during simulation:

1. "Net N just changed — which pins are actively driving it (so I can
   resolve its new value)?"
2. "Net N's resolved value just changed — which gates have an input on
   this net (so I know who to re-evaluate)?"

Answering these by scanning every pin in the circuit every time would be
horribly slow. Instead, `topology.ts` precomputes the answer **once**, as
two adjacency lists, stored in a classic sparse-graph format called
**CSR (Compressed Sparse Row)**:

```
offsets:  [0, 2, 2, 5, ...]        <- for net n, its entries live in
                                        entries[offsets[n] .. offsets[n+1])
entries:  [p3, p7, p1, p9, p12, ...]
```

For N nets, an `offsets` array of length N+1 marks where each net's
entries start and end inside one shared, flat `entries` array — no
per-net array allocation, no linked lists, just two contiguous buffers.
Looking up "net 5's neighbors" is `entries.slice(offsets[5], offsets[6])`,
an O(1) computation to *find* the range, then O(neighbor count) to walk
it — never O(everything).

Two such CSR graphs are stored:

- **`netDriverOffsets` / `netDriverPins`** — for each net, which
  `OUTPUT`/`INOUT` pins are its active drivers. Used to resolve a net's
  value.
- **`netFanoutOffsets` / `netFanoutGates`** — for each net, which distinct
  gates have at least one `INPUT`/`INOUT` pin on it — i.e. which gates
  must be re-evaluated when this net changes. **Deduplicated**: if a gate
  has two separate input pins tied to the same net, it still only appears
  once, so it's never accidentally re-evaluated twice in one propagation
  step.

This graph is *derived*, not hand-maintained — you never edit it directly.
It's produced from a `CircuitData` by the compiler (see
[§5.2](#52-compilerts--turning-a-netlist-into-a-runnable-graph)) and is
immutable for the lifetime of that circuit's structure.

### 4.5 `event-queue.ts` — the schedule

A **binary min-heap**, the standard data structure for "always give me the
next-soonest item, and let me insert new items cheaply" — exactly the
priority queue every event-driven simulator is built around (this is the
same algorithmic idea used in Dijkstra's algorithm, A*, and OS process
schedulers).

Each entry represents one instruction: *"at time T, pin P should begin
driving value V."* Structurally it's five parallel `Int32Array` columns
(time, insertion sequence, pin id, value, generation) arranged as a heap,
rather than an array of `{time, pin, value, ...}` objects — again, to
avoid allocating a JS object per event when a long-running simulation
might schedule millions of them.

Two extra fields beyond the obvious "time and what to do" are worth
calling out:

- **`sequence`** — a strictly increasing counter assigned at insertion
  time, used only to break ties when two events share the exact same
  `time`. Without it, the order two simultaneous events get processed in
  would be undefined; with it, they're processed in the order they were
  scheduled (FIFO), which makes every simulation run **deterministic and
  reproducible**.
- **`generation`** — supports *cancelling* an event without the O(n) cost
  of finding and removing an arbitrary item from a binary heap. This is
  important enough to have its own section — see
  [§8](#8-two-scheduling-regimes-derived-vs-authored-events).

`popBatchAtEarliestTime()` is the one operation the simulator actually
calls in its main loop: pop the single earliest event, then keep popping
while the next event shares that exact same time. This produces a "delta
cycle" — every event scheduled for this instant, as one batch. That
batching is what lets several signals change *simultaneously* without one
of them seeing a stale, half-updated view of the others (explained fully
in [§6](#6-the-simulation-algorithm-step-by-step)).

### 4.6 `runtime-state.ts` — the mutable, "hot" state

Everything above (`CircuitData`, `CircuitTopology`) describes a circuit and
never changes once compiled. `RuntimeState` is the opposite: it's the
**mutable** state of one specific simulation run, and it's touched on
almost every single event.

| Field                | Meaning                                                                    |
|-----------------------|------------------------------------------------------------------------------|
| `currentTime`          | The simulator's current position on the timeline                           |
| `pinDriveState[p]`     | The `SignalState` pin `p` is *currently* driving (for output/inout pins)  |
| `pinGeneration[p]`     | Per-pin counter, bumped on every new internally-derived schedule (see §8) |
| `netResolvedState[n]`  | Net `n`'s current resolved value                                            |
| `netResolutionKind[n]` | *Why* it resolved that way (undriven / single driver / agreement / contention) — diagnostic only |

Keeping this separate from the structural data is what makes
`sim.reset()` cheap: it just throws away the old `RuntimeState` and
allocates a fresh one, with zero need to re-derive the (unchanged)
topology graph. It also means, in principle, you could run several
independent simulations of the *same* compiled circuit (e.g. exploring
different input sequences) side by side, each with its own
`RuntimeState`, sharing one `CircuitData`/`CircuitTopology` pair.

---

## 5. The simulation layer, piece by piece

Everything in `src/simulation/` is **algorithms that operate on the data
layer** — nothing here stores state of its own (aside from the Simulator's
own bookkeeping, which is just an orchestrator holding references to a
`CircuitData`, a `CircuitTopology`, a `RuntimeState`, and an
`EventQueue`).

### 5.1 `gate-evaluators.ts` — pure truth tables

A set of plain functions: given `SignalState` inputs, return the
`SignalState` output. No side effects, no mutation, nothing about *when*
— just "what does this gate compute right now." Being pure functions makes
these trivially unit-testable in isolation (see
`tests/gate-evaluators.test.ts`), independent of the rest of the engine.

The truth tables follow the same "dominance" logic real HDL simulators use
for 4-value logic:

- **AND-family (`AND`/`NAND`):** a `LOW` input is *dominant* — if any
  input is `LOW`, the AND's output is `LOW` no matter what the other
  inputs are doing, even if they're `UNKNOWN`. (This mirrors real
  transistor behavior: one grounded input pulls the whole AND gate low
  regardless of the other inputs' uncertain state.) Otherwise, if any
  input is `UNKNOWN`/`FLOAT`, the result is `UNKNOWN`. Only if every input
  is a defined `HIGH` does the AND resolve to `HIGH`.
- **OR-family (`OR`/`NOR`):** the mirror image — `HIGH` is dominant.
- **XOR-family (`XOR`/`XNOR`):** parity-based (odd number of `HIGH`
  inputs → `HIGH`), but with **no dominance** — a single `UNKNOWN` input
  can flip the overall parity, so any `UNKNOWN`/`FLOAT` input makes the
  whole result `UNKNOWN`.
- **`NOT`/`BUFFER`:** invert or pass through defined levels; an
  `UNKNOWN`/`FLOAT` input produces an `UNKNOWN` output (an inverter can't
  produce a meaningful answer from an undefined input).
- **`TRISTATE_BUFFER`:** while `enable = HIGH`, passes `data` straight
  through. While `enable = LOW`, releases its output to `FLOAT`
  (disconnects — lets some other driver own the bus). If `enable` itself
  is `UNKNOWN`/`FLOAT`, we genuinely don't know whether the buffer is
  driving or not, so the output is `UNKNOWN`.
- **Sequential primitives** (`D_LATCH`, `D_FLIP_FLOP`, `SR_LATCH`) — see
  [§9](#9-sequential-elements-how-memory-works-with-no-memory-array).

`resolveNet()` is the other half of this file: given the states every
active driver on a net is presenting, decide what the net's actual value
is. `FLOAT` drivers are filtered out first (a disabled tri-state buffer
isn't "driving `FLOAT`" — it's simply not driving), and then:

| Active drivers                  | Result       | `NetResolutionKind`  |
|----------------------------------|--------------|------------------------|
| None                              | `FLOAT`      | `UNDRIVEN`             |
| Exactly one                       | that value   | `SINGLE_DRIVER`        |
| Several, all agreeing             | that value   | `AGREEMENT`            |
| Several, disagreeing              | `UNKNOWN`    | `CONTENTION`           |

This is the exact mechanism that makes a shared tri-state bus work
correctly, and correctly flags a genuine wiring bug (two outputs fighting
over one wire) as `UNKNOWN` instead of silently picking a winner.

### 5.2 `compiler.ts` — turning a netlist into a runnable graph

`compileTopology(circuit)` takes a `CircuitData` and produces the
`CircuitTopology` CSR graph described in [§4.4](#44-topologyts--the-derived-dependency-graph).
It runs `validateCircuit()` first, which checks structural sanity —
every pin must be connected to some net, and every net must have at least
one pin connected to it — and throws a descriptive error listing every
problem found if not. (It deliberately does **not** flag combinational
feedback loops as an error — an `SR_LATCH` built from cross-coupled NANDs
*is* a feedback loop, and it's entirely legal.)

Internally, the compiler builds the CSR arrays with ordinary JS
`Map`/`Set`/array intermediate structures rather than SoA — this is a
one-time cost (or "whenever the circuit's structure changes" cost) where
clarity is worth more than the last bit of performance; only the *output*
(the flat `Int32Array` CSR buffers the simulator actually reads every
tick) needs to be packed and fast.

### 5.3 `simulator.ts` — the engine itself

The `Simulator` class ties everything together: it owns a `CircuitData`, a
`CircuitTopology`, a `RuntimeState`, and an `EventQueue`, and exposes the
methods you actually call:

- `setInput(gate, value, atTime)` — drive a circuit-level `INPUT_PIN`
  (this is how you write a testbench / apply stimulus).
- `readOutput(gate)` / `probeNet(net)` — read a circuit-level `OUTPUT_PIN`,
  or any net directly.
- `step()` — process exactly one delta cycle.
- `run(untilTime?)` / `runFor(duration)` — process delta cycles until the
  queue drains, a time budget is reached, or a safety limit fires (see
  [§10](#10-safety-valves-stopping-a-simulation-that-never-settles)).
- `reset()` — throw away the current `RuntimeState` and start over, without
  needing to recompile the (unchanged) topology.

The actual algorithm lives in `processBatch()` and `evaluateGate()` — see
[§6](#6-the-simulation-algorithm-step-by-step) for the full walkthrough.
`evaluateGate()`'s switch is exhaustive over the actual `GateType` enum —
there's no `SUBCIRCUIT` case to speak of, because hierarchical designs
never reach this file as anything but ordinary gates. See
[§11](#11-subcircuits-composing-reusable-blocks-by-flattening).

### 5.4 `builder.ts` — ergonomics, not new behavior

A set of small helper functions (`createNand`, `createDFlipFlop`,
`createInput`, ...) that wrap `CircuitData`'s raw `addGate()`/`pinOf()`
calls and hand back a friendly object like `{ gate, inputs, output }`
instead of making every call site remember magic pin-role offsets. This
file introduces **no new data or state** — it's purely convenience on top
of the construction API in `circuit.ts`.

### 5.5 `subcircuit.ts` — reusable blocks, built by cloning

`defineSubcircuit()` and `instantiateSubcircuit()`: define a block once as
its own small `CircuitData`, then stamp out copies of it directly into a
parent `CircuitData`'s flat tables. Like `builder.ts`, this introduces no
new runtime concept — an instantiated subcircuit is just more gates and
nets in the same flat tables `compileTopology()` already knows how to
read. See [§11](#11-subcircuits-composing-reusable-blocks-by-flattening)
for the full design.

---

## 6. The simulation algorithm, step by step

This is the heart of the engine — `Simulator.processBatch()`, walked
through in full. Everything else in the codebase exists to support this.

The event queue holds one kind of instruction: **"at time T, pin P should
begin driving value V."** The simulator's main loop is:

```
while the queue isn't empty (and no safety limit has fired):
    pop every event that shares the single earliest scheduled time
        -> this is one "delta cycle" / "batch"
    process that batch (described below)
```

### Why batch by time at all?

Suppose two signals are meant to change at the exact same simulated
instant — say, two inputs to a gate both flip at t=10. If you processed
them one at a time, fully propagating the *first* change's consequences
before even looking at the second, a gate that reads both inputs might
briefly "see" only one of the two changes and compute a wrong, momentary
glitch value that never should have existed. Grouping same-time events
into one batch and applying **all** of them before resolving **any** net
avoids this — it's the standard "delta cycle" concept from HDL simulation.

### Processing one batch

**Step 1 — apply the events.**
For each event in the batch: check whether it's stale (see
[§8](#8-two-scheduling-regimes-derived-vs-authored-events) — most events
aren't), and if not, update that pin's `pinDriveState` to the event's
value. If the pin belongs to a `CLOCK` source, this is also where its
*next* toggle gets scheduled (a clock has no inputs, so nothing else would
ever wake it up — it has to keep rescheduling itself).

While doing this, collect the **set of distinct nets** touched by any
applied event (via each pin's `pinNet` lookup).

**Step 2 — re-resolve every touched net.**
For each touched net, look up its driver pins via the topology graph
(`topology.driverPins(net)` — an O(driver count) walk, not a scan of the
whole circuit), gather what each is currently driving, and run
`resolveNet()` on those values (see [§5.1](#51-gate-evaluatorsts--pure-truth-tables)).
If the result differs from the net's previous resolved value, record the
net as **changed**, remember its *previous* value (needed for clock-edge
detection — see [§9](#9-sequential-elements-how-memory-works-with-no-memory-array)),
and update its stored state.

If nothing actually changed value this batch, we're done — no need to look
any further downstream.

**Step 3 — find who cares.**
For every net that changed, walk its fanout list in the topology graph
(`topology.fanoutGates(net)` — again O(fanout count), not a scan) and
collect the **union of all affected gates**, deduplicated across every
changed net in this batch. This is the graph-based part of "event-driven,
graph-based simulation": we go directly from "these nets changed" to
"these exact gates need attention," with no searching.

**Step 4 — re-evaluate, and schedule what changes.**
For each gate in that set, evaluate it exactly once (using
`gate-evaluators.ts`, reading its inputs' now-fully-settled net states)
and compare the result to what it's *currently* driving. If different,
schedule a new event for `currentTime + gate.delay` — that gate's
propagation delay determines how far in the future its new output takes
effect. If the computed value is the *same* as what it's already driving,
nothing is scheduled — this is what makes a circuit "settle" instead of
generating an endless stream of no-op events.

That's it — repeat for the next batch. There's no fixed clock tick
anywhere in this loop; time only ever advances to the next value that
something actually has scheduled.

```
                 ┌─────────────────────────────┐
                 │  pop earliest-time batch     │
                 └───────────────┬─────────────┘
                                 ▼
                 ┌─────────────────────────────┐
                 │ 1. apply each event:         │
                 │    pinDriveState[pin] = val  │
                 │    (CLOCK reschedules self)  │
                 └───────────────┬─────────────┘
                                 ▼
                 ┌─────────────────────────────┐
                 │ 2. for each touched net:     │
                 │    resolveNet(driver states) │──── topology.driverPins(net)
                 │    -> did it change?         │
                 └───────────────┬─────────────┘
                                 ▼
                 ┌─────────────────────────────┐
                 │ 3. union of fanout gates     │──── topology.fanoutGates(net)
                 │    across all changed nets   │
                 └───────────────┬─────────────┘
                                 ▼
                 ┌─────────────────────────────┐
                 │ 4. evaluate each gate once;  │
                 │    if output changed,        │
                 │    schedule new event at     │
                 │    time + gate.delay         │
                 └───────────────┬─────────────┘
                                 ▼
                     (back to the top of the loop)
```

---

## 7. Worked example: simulating a single NAND gate

To make the algorithm concrete, here's exactly what happens for the
simplest possible circuit: two inputs `A`, `B` feeding a 2-input NAND gate
with delay 1, feeding an output `Y`.

```ts
sim.setInput(A, HIGH, 0);
sim.setInput(B, HIGH, 0);
sim.run();
```

1. Two externally-authored events are scheduled: `(t=0, pin=A.output,
   value=HIGH)` and `(t=0, pin=B.output, value=HIGH)`.
2. `run()` pops the batch at t=0 — both events, since they share a time.
3. **Apply:** `pinDriveState[A.output] = HIGH`, `pinDriveState[B.output] =
   HIGH`. Touched nets: `netA`, `netB`.
4. **Resolve:** `netA` has one driver (`A.output`, `HIGH`) → resolves to
   `HIGH` (`SINGLE_DRIVER`), changed from its initial `FLOAT`. Same for
   `netB`.
5. **Fanout:** both `netA` and `netB` fan out to the NAND gate. Union =
   `{ nandGate }` (counted once, not twice).
6. **Evaluate:** NAND reads its inputs' current net states — `HIGH, HIGH`
   — and computes `evaluateNand([HIGH, HIGH]) = LOW`. That differs from
   what the NAND's output pin is currently driving (`FLOAT`, its initial
   value), so an event is scheduled: `(t=0+1=1, pin=nand.output,
   value=LOW)`.
7. `run()` loops. Next batch is at t=1: one event.
8. **Apply:** `pinDriveState[nand.output] = LOW`. Touched net: `netY`.
9. **Resolve:** `netY` has one driver (`nand.output`, `LOW`) → resolves to
   `LOW`, changed from `FLOAT`.
10. **Fanout:** `netY` fans out to the `OUTPUT_PIN` gate `Y`.
11. **Evaluate:** `OUTPUT_PIN` gates have no `INPUT` pins of their own —
    reading `Y`'s value doesn't require "evaluating" anything, so this
    step is a no-op (`OUTPUT_PIN` never appears in `evaluateGate()`'s real
    work; it's a probe, not a computation). No further events are
    scheduled.
12. The queue is now empty. `run()` returns `QUEUE_EMPTY`.
13. `sim.readOutput(Y)` reads `netY`'s resolved state directly: `LOW` —
    correct, since `NAND(HIGH, HIGH) = LOW`.

Notice that the simulator did exactly two units of work (two delta
cycles), touching only the gates that were actually affected — nothing
scanned the whole circuit, and nothing was re-evaluated "just in case."

---

## 8. Two scheduling regimes: derived vs. authored events

This distinction is subtle enough, and important enough, that it gets its
own section (it's also explained inline in `simulator.ts`, right next to
the code it governs).

### The problem

During Step 4 of the algorithm above, a gate might get re-evaluated
*again* before an event it previously scheduled has actually fired — for
example, if one of its inputs flickers twice in quick succession. The
*old* scheduled output is now wrong (it was computed from stale inputs)
and must not be allowed to fire. But a binary heap doesn't support cheaply
removing an arbitrary item from the middle — that's an O(n) operation.

### The solution: lazy deletion via a generation counter

Instead of removing the stale event, the engine marks it as
**superseded** and simply ignores it when it's eventually popped. Each pin
has a `pinGeneration` counter in `RuntimeState`. Every time the simulator
schedules a *new, internally-derived* event for a pin (Step 4 of the
algorithm), it bumps that pin's generation and stamps the event with the
new value. When an event is later popped off the queue, the simulator
checks: does this event's stamped generation match the pin's *current*
generation? If not, a newer decision has already superseded it, and it's
silently discarded. This is the standard "lazy deletion" / decrease-key
emulation trick for priority queues.

### The catch: this breaks external stimulus if applied everywhere

`setInput()` lets you script a whole sequence of future events on the same
pin, e.g.:

```ts
sim.setInput(kick, HIGH, 0);
sim.setInput(kick, FLOAT, 9);
```

If *both* of these calls bumped the same shared generation counter, the
second call (scheduled for the *later* time, t=9) would bump the
generation *before* the first event (scheduled for the *earlier* time,
t=0) ever gets a chance to fire — and when t=0 arrives, that event would
look "stale" by the same check described above, and get wrongly discarded,
even though it's chronologically first and entirely legitimate. This
isn't a hypothetical: it's a bug that showed up in this engine's own test
suite during development (a ring-oscillator "kick" pulse — see the git
history / commit notes for `simulator.test.ts` — was silently dropped for
exactly this reason).

The fix is to recognize that internally-derived events and
externally-authored events represent fundamentally different intents:

- An internally-derived event is a **recomputed decision** — a gate's
  output is a pure function of its current inputs, so a newer decision
  legitimately supersedes an older one for the same pin.
- An externally-authored event is an **authored fact** — "the testbench
  says this pin becomes X at time T," full stop. It should never be
  invalidated just because some *other*, unrelated future event was
  scheduled on the same pin.

So external events (from `setInput()`, and from seeding `CONSTANT` /
`CLOCK` / initial sequential-element state) are tagged with a sentinel
generation value (`EXTERNAL_GENERATION`) that **unconditionally bypasses**
the staleness check — they always fire exactly when scheduled, no matter
what else happens to that pin's generation counter in the meantime.
Internally-derived events (gate outputs, computed in Step 4 of the
algorithm) continue to use the real per-pin generation counter, because
that's precisely the case where "supersede the old one" is the *correct*
behavior.

---

## 9. Sequential elements: how "memory" works with no memory array

You might expect a flip-flop to need some dedicated "memory cell" data
structure to hold its stored value. It doesn't — and the reason why is a
nice illustration of how the pieces of this engine fit together.

A flip-flop's `Q` output is, structurally, just an ordinary output pin
like any gate's. `RuntimeState.pinDriveState[Q]` already stores "what is
this pin currently driving" for every pin in the circuit. So the flip-flop
*is* its own memory: whatever `Q`'s output pin is currently driving **is**
the stored bit, with no separate storage needed.

The interesting part is: a flip-flop's evaluator needs to know its
*previous* Q value to implement "hold" (when there's no clock edge, keep
whatever you were already outputting). That's answered by simply reading
`pinDriveState[Q]` *before* computing the new value — the "previous" state
is right there, because we haven't overwritten it yet.

Edge-detection works the same way, one level up: a `D_FLIP_FLOP` needs to
know not just its clock net's *current* value but whether it just
**transitioned** (e.g. rose from LOW to HIGH). During Step 2 of the
algorithm, the simulator already computes a net's value *before* and
*after* resolution for every net that changed this batch — so it captures
that before/after pair into a small, short-lived map (`previousNetStates`,
scoped to just the current batch) and hands it to the gate evaluator.
`didClockEdgeOccur(previous, current, configuredEdge)` then does the
actual comparison, purely as a function of those two values — no separate
"last clock state" field needs to be stored anywhere persistently.

So: no dedicated memory data structure exists anywhere for sequential
elements — "memory" falls directly out of the fact that `RuntimeState`
only overwrites a value once a new one has been computed, and the
simulator already tracks before/after net states for exactly the batch
that's currently being processed.

(Initial state is the one place this needs a nudge: a flip-flop that's
never been clocked has no "previous" value to read, so at circuit
initialization every sequential element's `Q`/`QN` outputs are seeded to
`UNKNOWN` — reflecting the honest truth that real hardware powers on in an
undefined state — via the same externally-authored scheduling path
described in [§8](#8-two-scheduling-regimes-derived-vs-authored-events).)

---

## 10. Safety valves: stopping a simulation that never settles

Not every circuit reaches a stable, event-free state. A free-running
`CLOCK` reschedules itself forever by design. A ring oscillator (an odd
number of inverters wired in a feedback loop) has no stable fixed point —
`NOT(LOW) = HIGH`, `NOT(HIGH) = LOW`, forever — and will genuinely
oscillate for as long as you let it run, exactly like the real circuit it
models.

`run()` accepts a target time (`run(untilTime)`) and the `Simulator`
constructor accepts `maxEvents`/`maxTime` options (with sane defaults in
`constants.ts`), so a caller always has a way to bound how long a
simulation is allowed to run, and `run()` reports *why* it stopped
(`'QUEUE_EMPTY' | 'MAX_EVENTS' | 'MAX_TIME' | 'TARGET_TIME_REACHED'`) so
calling code can tell "the circuit settled" apart from "we hit a safety
limit while it was still active."

One more subtlety worth knowing, because it surprised even this engine's
own test suite during development: a feedback loop with **no** external
stimulus at all never schedules a *single* event in the first place (every
pin legitimately starts, and stays, `FLOAT` — nothing ever perturbs it, so
there's nothing to react to). That's not a bug; it's the mathematically
correct behavior for an ideal digital simulator, mirroring a real circuit
that's simply unpowered. To make a ring oscillator actually oscillate, you
have to inject one momentary "kick" pulse to break the symmetry — and even
then, if you release that kick pulse *before* the loop's own feedback
signal has arrived to take over, the net briefly becomes genuinely
undriven, which resolves to `UNKNOWN` — and since `NOT(UNKNOWN) =
UNKNOWN`, an `UNKNOWN` value circulating through an all-inverter loop is
itself a **stable fixed point**, so the "oscillator" would settle into a
steady `UNKNOWN` state instead of oscillating. (`simulator.test.ts`'s ring
oscillator test times the kick's release to land in the exact same delta
cycle as the feedback signal's first return, so the net transitions
cleanly from "kick-driven" straight to "feedback-driven" with no undriven
gap in between.) This is exactly the kind of behavior a correct 4-value
event-driven simulator is supposed to exhibit — it's a feature of the
model being faithful to real hardware, not an artifact to work around.

---

## 11. Subcircuits: composing reusable blocks by flattening

A subcircuit is a reusable circuit block with named input/output ports,
built out of other gates — including other subcircuits. `NAND`, `NOT`,
`D_FLIP_FLOP`, and so on are the engine's *primitive* vocabulary; a
subcircuit lets you define your own words in that vocabulary (a half
adder, a 4-bit register, an ALU) and reuse them freely.

### The design question: flatten, or give it a runtime presence?

The type system originally reserved a `SUBCIRCUIT` `GateType` for this,
with two ways it could have gone:

1. **Flatten at construction time.** A subcircuit is defined as its own
   small `CircuitData`. Each time it's *instantiated*, its gates and
   internal wiring are cloned directly into the parent circuit's flat
   tables. By the time `compileTopology()` runs, there is no "subcircuit"
   left to see — just more gates and nets, indistinguishable from ones
   that were hand-wired.
2. **Give `SUBCIRCUIT` gates a nested `Simulator`.** Keep the hierarchy at
   runtime: an instance holds a reference to a child `Simulator`, and
   `evaluateGate()` marshals signals across the boundary — pushing parent
   net changes into the child's `INPUT_PIN`s, pulling the child's
   `OUTPUT_PIN` results back out — every time a `SUBCIRCUIT` gate's inputs
   change.

This engine flattens. Option 2 fights the rest of the architecture on its
own terms: [§6](#6-the-simulation-algorithm-step-by-step) explains that
*batching same-time events before resolving any net* is precisely what
keeps a delta cycle from producing order-dependent glitches — the entire
point of a single, global, time-ordered event queue. A nested `Simulator`
per instance means a nested event queue and nested delta cycles running
out of step with the parent's, reintroducing exactly the class of bug §6
exists to prevent, right at every subcircuit boundary. It would also mean
re-deriving a `CircuitTopology` per instance and marshaling signals across
the boundary on every delta cycle, for a hierarchy that flattening removes
for free. Option 1 costs nothing at simulation time: `compiler.ts`,
`topology.ts`, `simulator.ts`, and `gate-evaluators.ts` needed **zero**
changes to support subcircuits, because none of them are aware subcircuits
exist.

### `defineSubcircuit()` — building the template

```ts
const halfAdder = defineSubcircuit('HalfAdder', (c) => {
  const a = createInput(c, 'A');
  const b = createInput(c, 'B');
  const xor = createXor(c, 2);
  const and = createAnd(c, 2);
  const sum = createOutput(c, 'SUM');
  const carry = createOutput(c, 'CARRY');

  c.wire([a.output, xor.inputs[0], and.inputs[0]]);
  c.wire([b.output, xor.inputs[1], and.inputs[1]]);
  c.wire([xor.output, sum.input]);
  c.wire([and.output, carry.input]);

  return { inputs: { A: a, B: b }, outputs: { SUM: sum, CARRY: carry } };
});
```

`build` gets a fresh `CircuitData` and constructs the block's internals
with the ordinary `builder.ts` functions — a subcircuit definition is
built exactly like any other circuit, with no special API to learn. It
returns which of the `INPUT_PIN`/`OUTPUT_PIN` handles it created are the
block's named ports. `defineSubcircuit()` runs `validateCircuit()`
immediately, so a broken definition (a dangling pin, a port that isn't
actually an `INPUT_PIN`/`OUTPUT_PIN` gate) fails right there, not later
inside some unrelated parent circuit's validation errors.

### `instantiateSubcircuit()` — stamping out a copy

```ts
const inst = instantiateSubcircuit(circuit, halfAdder, 'ha1');
circuit.connect(extA.output, inst.inputs.A);
circuit.connect(extB.output, inst.inputs.B);
circuit.connect(sumOut.input, inst.outputs.SUM);
```

Each call clones the definition's gates and nets into `circuit`'s flat
tables, remapping gate/pin/net ids as it goes — instantiating the same
definition N times costs N times the gates, exactly as if they'd been
hand-wired N times, with no shared runtime state between instances (see
`circuit-builder.test.ts`-style independence checks in
`subcircuit.test.ts`). The definition itself is never mutated — it's a
template, cloned from on every instantiation.

The definition's own boundary `INPUT_PIN`/`OUTPUT_PIN` gates exist only so
it can be built and validated standalone; they are **not** cloned.
Instead, the internal net each one was wired to is cloned and returned
directly as the port (`inst.inputs.A`, `inst.outputs.SUM`, ... — `NetId`s,
not gates). A port costs nothing beyond what a hand-wired net already
costs: no wrapper buffer, no extra propagation delay, no signal
translation at the boundary. This is what "flattening" buys you concretely
— an instantiated half adder's `XOR`/`AND` gates settle with the exact
same delay as if you'd wired them into the parent circuit by hand.

### Composing instances: `mergeNets()`

Wiring an external pin onto a port is just `connect(pin, portNet)` — the
port is already a net, and `connect()` adds a pin to an existing net.
But chaining one instance's *output* port straight into another
instance's *input* port (no external pin involved, as in a ripple-carry
adder built from full adders) means joining two nets that **each already
have their own pins** — `connect()` can't do that; it only ever adds one
pin to one net.

`CircuitData.mergeNets(keep, absorb)` is the general-purpose primitive
this needs: every pin currently on `absorb` is reassigned onto `keep`,
and `absorb` is retired.

```ts
const ha1 = instantiateSubcircuit(circuit, halfAdder, 'ha1');
const ha2 = instantiateSubcircuit(circuit, halfAdder, 'ha2');
circuit.connect(a.output, ha1.inputs.A);
circuit.connect(b.output, ha1.inputs.B);
circuit.mergeNets(ha1.outputs.SUM, ha2.inputs.A); // ha1.SUM feeds ha2.A directly
circuit.connect(cin.output, ha2.inputs.B);
```

Nets are append-only, flat storage with no compaction (consistent with
every other table in `circuit.ts` — see [§3](#3-why-data-oriented-design)),
so a merged-away net keeps its id but contributes nothing; it's simply
never referenced by any pin again. The one thing this requires is
excluding it from `validateCircuit()`'s "net has no pins connected to it"
check, since that check exists to catch *forgotten* nets, and a
deliberately-merged one isn't one. `CircuitData` tracks this with a small
`absorbedNets` set, queryable via `isNetAbsorbed()`.

### Nesting

Because a subcircuit definition's `build` function is handed an ordinary
`CircuitData`, it can call `instantiateSubcircuit()` itself — a
`FullAdder` definition can be built from two `HalfAdder` instances plus an
`OR` gate, and a `RippleCarryAdder` can in turn be built from several
`FullAdder` instances. Nesting needs no special support: it's the same
`defineSubcircuit()`/`instantiateSubcircuit()` pair, called recursively.

The one subtlety this raises: if a definition's own `build` function calls
`mergeNets()` internally (chaining its own nested instances together), the
resulting "absorbed" net has to remain absorbed after *that* definition is
itself cloned into some larger parent — otherwise the clone would trip the
same "unused net" check the original definition correctly skipped.
`instantiateSubcircuit()` propagates this bit explicitly when cloning each
net (`CircuitData.markNetAbsorbed()`), which is exactly the kind of thing
`subcircuit.test.ts`'s nested ripple-carry-adder test exists to catch.

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| **Netlist** | The structural description of a circuit: what gates exist and how their pins are wired via nets. Stored in `CircuitData`. |
| **Net** | A wire — a set of pins that are all electrically the same node. |
| **Pin** | A single input or output terminal on a gate. |
| **Delta cycle** | A batch of events that all share the exact same simulated time, processed together so simultaneous changes don't produce spurious ordering glitches. |
| **Propagation delay** | The simulated time a gate takes to update its output after its inputs change. Stored per-gate as `gateDelay`. |
| **Fanout** | The set of gates that read (depend on) a given net. |
| **CSR (Compressed Sparse Row)** | A memory-efficient way to store a sparse graph's adjacency lists as two flat arrays (an offsets array and an entries array) instead of one array/list per node. |
| **SoA (Structure of Arrays)** | Storing each field of a collection of records as its own contiguous array, rather than storing an array of per-record objects (AoS). The layout this entire engine is built on. |
| **Contention** | Two or more active drivers on the same net disagreeing about its value — resolves to `UNKNOWN`. |
| **Stale event** | An event still sitting in the queue that has been superseded by a newer decision for the same pin, and should be ignored rather than applied when popped. |
| **Generation counter** | The per-pin mechanism used to detect stale, internally-derived events (see §8). |
| **Delta-cycle / event-driven simulation** | A simulation strategy where work happens only in direct response to scheduled changes, as opposed to re-evaluating everything on a fixed timestep. |
| **Subcircuit** | A reusable circuit block with named input/output ports, defined once and instantiated (copied) as many times as needed (see §11). |
| **Flattening** | Cloning a subcircuit definition's gates and nets directly into a parent circuit's flat tables at construction time, so no runtime concept of "subcircuit" survives into simulation. |
| **Port** | A subcircuit instance's named connection point. Structurally just a `NetId` — the internal net a boundary `INPUT_PIN`/`OUTPUT_PIN` was wired to in the definition, exposed directly with no extra buffering. |
