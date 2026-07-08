import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CircuitData, SrLatchKind } from '../../data/circuit';
import { EdgeType, SignalState } from '../../data/types';
import { compileTopology } from '../compiler';
import { Simulator } from '../simulator';
import {
  createInput,
  createOutput,
  createNand,
  createAnd,
  createOr,
  createXor,
  createNot,
  createClock,
  createTristateBuffer,
  createDFlipFlop,
  createDLatch,
  createSrLatch,
} from '../builder';

const { LOW, HIGH, FLOAT, UNKNOWN } = SignalState;

function buildAndCompile(build: (c: CircuitData) => void) {
  const circuit = new CircuitData();
  build(circuit);
  const topology = compileTopology(circuit);
  return { circuit, topology };
}

describe('Simulator: 2-input NAND truth table', () => {
  const cases: [SignalState, SignalState, SignalState][] = [
    [LOW, LOW, HIGH],
    [LOW, HIGH, HIGH],
    [HIGH, LOW, HIGH],
    [HIGH, HIGH, LOW],
  ];

  for (const [aVal, bVal, expected] of cases) {
    test(`A=${SignalState[aVal]} B=${SignalState[bVal]} -> Y=${SignalState[expected]}`, () => {
      let inputA: ReturnType<typeof createInput>;
      let inputB: ReturnType<typeof createInput>;
      let output: ReturnType<typeof createOutput>;

      const { circuit, topology } = buildAndCompile((c) => {
        inputA = createInput(c, 'A');
        inputB = createInput(c, 'B');
        const nand = createNand(c, 2);
        output = createOutput(c, 'Y');
        c.wire([inputA.output, nand.inputs[0]]);
        c.wire([inputB.output, nand.inputs[1]]);
        c.wire([nand.output, output.input]);
      });

      const sim = new Simulator(circuit, topology);
      sim.setInput(inputA!.gate, aVal, 0);
      sim.setInput(inputB!.gate, bVal, 0);
      sim.run();

      assert.equal(sim.readOutput(output!.gate), expected);
    });
  }
});

describe('Simulator: propagation delay ordering', () => {
  test('a chain of inverters delays output changes by the sum of gate delays', () => {
    let input: ReturnType<typeof createInput>;
    let output: ReturnType<typeof createOutput>;
    const delay = 5;

    const { circuit, topology } = buildAndCompile((c) => {
      input = createInput(c, 'A');
      const n1 = createNot(c, delay);
      const n2 = createNot(c, delay);
      const n3 = createNot(c, delay);
      output = createOutput(c, 'Y');
      c.wire([input.output, n1.input]);
      c.wire([n1.output, n2.input]);
      c.wire([n2.output, n3.input]);
      c.wire([n3.output, output.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(input!.gate, HIGH, 0);

    let steps = 0;
    while (sim.step().processed) steps++;

    assert.equal(sim.readOutput(output!.gate), LOW); // NOT(NOT(NOT(HIGH))) = LOW
    assert.equal(sim.state.currentTime, 3 * delay);
    assert.ok(steps >= 3); // at least one delta cycle per inverter stage
  });
});

describe('Simulator: combinational composition (half adder)', () => {
  test('XOR/AND half adder matches the truth table for all input combinations', () => {
    let inputA: ReturnType<typeof createInput>;
    let inputB: ReturnType<typeof createInput>;
    let sumOut: ReturnType<typeof createOutput>;
    let carryOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      inputA = createInput(c, 'A');
      inputB = createInput(c, 'B');
      const xor = createXor(c, 2);
      const and = createAnd(c, 2);
      sumOut = createOutput(c, 'SUM');
      carryOut = createOutput(c, 'CARRY');

      const netA = c.wire([inputA.output, xor.inputs[0], and.inputs[0]]);
      const netB = c.wire([inputB.output, xor.inputs[1], and.inputs[1]]);
      c.wire([xor.output, sumOut.input]);
      c.wire([and.output, carryOut.input]);
      void netA;
      void netB;
    });

    const truth: [SignalState, SignalState, SignalState, SignalState][] = [
      [LOW, LOW, LOW, LOW],
      [LOW, HIGH, HIGH, LOW],
      [HIGH, LOW, HIGH, LOW],
      [HIGH, HIGH, LOW, HIGH],
    ];

    for (const [aVal, bVal, expectedSum, expectedCarry] of truth) {
      const sim = new Simulator(circuit, topology);
      sim.setInput(inputA!.gate, aVal, 0);
      sim.setInput(inputB!.gate, bVal, 0);
      sim.run();
      assert.equal(sim.readOutput(sumOut!.gate), expectedSum, `SUM for ${aVal},${bVal}`);
      assert.equal(sim.readOutput(carryOut!.gate), expectedCarry, `CARRY for ${aVal},${bVal}`);
    }
  });
});

describe('Simulator: primitive SR latch', () => {
  test('set, reset, and hold behavior', () => {
    let s: ReturnType<typeof createInput>;
    let r: ReturnType<typeof createInput>;
    let qOut: ReturnType<typeof createOutput>;
    let qnOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      s = createInput(c, 'S');
      r = createInput(c, 'R');
      const latch = createSrLatch(c, SrLatchKind.NOR_BASED);
      qOut = createOutput(c, 'Q');
      qnOut = createOutput(c, 'QN');
      c.wire([s.output, latch.s]);
      c.wire([r.output, latch.r]);
      c.wire([latch.q, qOut.input]);
      c.wire([latch.qn, qnOut.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(s!.gate, LOW, 0);
    sim.setInput(r!.gate, LOW, 0);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), UNKNOWN); // uninitialized

    sim.setInput(s!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH); // set

    sim.setInput(s!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH); // holds

    sim.setInput(r!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW); // reset
  });

  test('cross-coupled NAND SR latch built from primitive gates is bistable', () => {
    let sBar: ReturnType<typeof createInput>;
    let rBar: ReturnType<typeof createInput>;
    let qOut: ReturnType<typeof createOutput>;
    let qnOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      sBar = createInput(c, 'S_BAR');
      rBar = createInput(c, 'R_BAR');
      const nand1 = createNand(c, 2, 2, 'NAND1'); // Q  = NAND(S_BAR, QN)
      const nand2 = createNand(c, 2, 2, 'NAND2'); // QN = NAND(R_BAR, Q)
      qOut = createOutput(c, 'Q');
      qnOut = createOutput(c, 'QN');

      c.wire([sBar.output, nand1.inputs[0]]);
      c.wire([rBar.output, nand2.inputs[0]]);
      const netQ = c.wire([nand1.output, nand2.inputs[1], qOut.input]);
      const netQN = c.wire([nand2.output, nand1.inputs[1], qnOut.input]);
      void netQ;
      void netQN;
    });

    const sim = new Simulator(circuit, topology, { maxEvents: 10_000, maxTime: 10_000 });
    sim.setInput(sBar!.gate, LOW, 0);
    sim.setInput(rBar!.gate, HIGH, 0);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH);
    assert.equal(sim.readOutput(qnOut!.gate), LOW);

    sim.setInput(sBar!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH); // still set

    sim.setInput(rBar!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW);
    assert.equal(sim.readOutput(qnOut!.gate), HIGH);
  });
});

describe('Simulator: tri-state bus contention', () => {
  test('only the enabled driver controls the bus; disabling all drivers floats it', () => {
    let dataA: ReturnType<typeof createInput>;
    let enableA: ReturnType<typeof createInput>;
    let dataB: ReturnType<typeof createInput>;
    let enableB: ReturnType<typeof createInput>;
    let busOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      dataA = createInput(c, 'DATA_A');
      enableA = createInput(c, 'EN_A');
      dataB = createInput(c, 'DATA_B');
      enableB = createInput(c, 'EN_B');
      const bufA = createTristateBuffer(c);
      const bufB = createTristateBuffer(c);
      busOut = createOutput(c, 'BUS');

      c.wire([dataA.output, bufA.data]);
      c.wire([enableA.output, bufA.enable]);
      c.wire([dataB.output, bufB.data]);
      c.wire([enableB.output, bufB.enable]);
      c.wire([bufA.output, bufB.output, busOut.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(dataA!.gate, HIGH, 0);
    sim.setInput(enableA!.gate, LOW, 0);
    sim.setInput(dataB!.gate, LOW, 0);
    sim.setInput(enableB!.gate, LOW, 0);
    sim.run();
    assert.equal(sim.readOutput(busOut!.gate), FLOAT); // nobody driving

    sim.setInput(enableA!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(busOut!.gate), HIGH); // A drives

    sim.setInput(enableA!.gate, LOW, sim.state.currentTime + 1);
    sim.setInput(enableB!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(busOut!.gate), LOW); // B drives

    sim.setInput(enableA!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(busOut!.gate), UNKNOWN);
  });
});

describe('Simulator: free-running clock', () => {
  test('toggles at the configured half-period and reaches the expected number of edges', () => {
    let clkOut: ReturnType<typeof createOutput>;
    const halfPeriod = 10;

    const { circuit, topology } = buildAndCompile((c) => {
      const clk = createClock(c, halfPeriod, LOW, 'CLK');
      clkOut = createOutput(c, 'CLK_OUT');
      c.wire([clk.output, clkOut.input]);
    });

    const sim = new Simulator(circuit, topology, { maxTime: 105 });
    sim.run(105);

    assert.equal(sim.probeNet(0 as any), LOW);
    assert.ok(sim.stats().netTransitions >= 10);
  });
});

describe('Simulator: D latch transparency', () => {
  test('follows data while enabled, holds while disabled', () => {
    let data: ReturnType<typeof createInput>;
    let enable: ReturnType<typeof createInput>;
    let qOut: ReturnType<typeof createOutput>;
    let qnOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      data = createInput(c, 'D');
      enable = createInput(c, 'EN');
      const latch = createDLatch(c);
      qOut = createOutput(c, 'Q');
      qnOut = createOutput(c, 'QN');
      c.wire([data.output, latch.data]);
      c.wire([enable.output, latch.enable]);
      c.wire([latch.q, qOut.input]);
      c.wire([latch.qn, qnOut.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(enable!.gate, HIGH, 0);
    sim.setInput(data!.gate, HIGH, 0);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH);

    sim.setInput(data!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW); // transparent: follows data

    sim.setInput(enable!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    sim.setInput(data!.gate, HIGH, sim.state.currentTime + 1); // should be ignored
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW); // holds, disabled
  });
});

describe('Simulator: D flip-flop edge-triggered behavior', () => {
  test('captures data only on the configured clock edge, ignores changes between edges', () => {
    let data: ReturnType<typeof createInput>;
    let clock: ReturnType<typeof createInput>;
    let reset: ReturnType<typeof createInput>;
    let set: ReturnType<typeof createInput>;
    let qOut: ReturnType<typeof createOutput>;
    let qnOut: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      data = createInput(c, 'D');
      clock = createInput(c, 'CLK');
      reset = createInput(c, 'RST');
      set = createInput(c, 'SET');
      const dff = createDFlipFlop(c, EdgeType.RISING);
      qOut = createOutput(c, 'Q');
      qnOut = createOutput(c, 'QN');
      c.wire([data.output, dff.data]);
      c.wire([clock.output, dff.clock]);
      c.wire([reset.output, dff.reset]);
      c.wire([set.output, dff.set]);
      c.wire([dff.q, qOut.input]);
      c.wire([dff.qn, qnOut.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(reset!.gate, LOW, 0);
    sim.setInput(set!.gate, LOW, 0);
    sim.setInput(clock!.gate, LOW, 0);
    sim.setInput(data!.gate, HIGH, 0);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), UNKNOWN); // uninitialized, no edge yet

    sim.setInput(data!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), UNKNOWN);

    sim.setInput(clock!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW);

    sim.setInput(data!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW);

    sim.setInput(clock!.gate, LOW, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW);

    sim.setInput(clock!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), HIGH);

    sim.setInput(reset!.gate, HIGH, sim.state.currentTime + 1);
    sim.run();
    assert.equal(sim.readOutput(qOut!.gate), LOW);
  });
});

describe('Simulator: combinational feedback / ring oscillator', () => {
  test('an odd-length inverter loop, once kicked, self-oscillates and is bounded by maxTime', () => {
    let kick: ReturnType<typeof createInput>;
    const gateDelay = 3;

    const { circuit, topology } = buildAndCompile((c) => {
      kick = createInput(c, 'KICK');
      const n1 = createNot(c, gateDelay);
      const n2 = createNot(c, gateDelay);
      const n3 = createNot(c, gateDelay);
      c.wire([kick.output, n3.output, n1.input]); // kick shares the loop net with n3's feedback
      c.wire([n1.output, n2.input]);
      c.wire([n2.output, n3.input]);
    });

    const sim = new Simulator(circuit, topology, { maxTime: 200, maxEvents: 100_000 });
    sim.setInput(kick!.gate, HIGH, 0);
    sim.setInput(kick!.gate, FLOAT, 3 * gateDelay);
    const stopReason = sim.run();

    assert.equal(stopReason, 'MAX_TIME');
    assert.ok(sim.stats().netTransitions > 10); // it was actually oscillating, not stuck
  });
});

describe('Simulator: reset() reinitializes a compiled circuit for repeated runs', () => {
  test('the same compiled circuit can be simulated multiple times independently', () => {
    let input: ReturnType<typeof createInput>;
    let output: ReturnType<typeof createOutput>;

    const { circuit, topology } = buildAndCompile((c) => {
      input = createInput(c, 'A');
      const n = createNot(c);
      output = createOutput(c, 'Y');
      c.wire([input.output, n.input]);
      c.wire([n.output, output.input]);
    });

    const sim = new Simulator(circuit, topology);
    sim.setInput(input!.gate, HIGH, 0);
    sim.run();
    assert.equal(sim.readOutput(output!.gate), LOW);

    sim.reset();
    assert.equal(sim.probeNet(0 as any), FLOAT); // back to undriven

    sim.setInput(input!.gate, LOW, 0);
    sim.run();
    assert.equal(sim.readOutput(output!.gate), HIGH);
  });
});
