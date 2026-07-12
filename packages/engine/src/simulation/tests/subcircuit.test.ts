import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CircuitData } from '../../data';
import { SignalState } from '../../data';
import { compileTopology } from '../compiler';
import { Simulator } from '../simulator';
import { createInput, createOutput, createAnd, createOr, createXor } from '../builder';
import { defineSubcircuit, instantiateSubcircuit } from '../subcircuit';

const { LOW, HIGH } = SignalState;

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

describe('defineSubcircuit', () => {
  test('rejects a definition with a dangling internal pin', () => {
    assert.throws(() => {
      defineSubcircuit('Broken', (c) => {
        const a = createInput(c, 'A');
        const out = createOutput(c, 'Y');
        // 'a' is never wired to 'out' -> both pins left dangling.
        return { inputs: { A: a }, outputs: { Y: out } };
      });
    });
  });

  test('rejects a definition with no ports at all', () => {
    assert.throws(() => {
      defineSubcircuit('NoPorts', (c) => {
        const a = createInput(c, 'A');
        const out = createOutput(c, 'Y');
        c.wire([a.output, out.input]);
        return { inputs: {}, outputs: {} };
      });
    });
  });

  test('rejects a port handle that is not actually an INPUT_PIN/OUTPUT_PIN gate', () => {
    assert.throws(() => {
      defineSubcircuit('WrongPortType', (c) => {
        const a = createInput(c, 'A');
        const out = createOutput(c, 'Y');
        const buf = createXor(c, 1); // 1-input XOR is just a pass-through
        c.wire([a.output, buf.inputs[0]]);
        c.wire([buf.output, out.input]);
        // deliberately mislabel the XOR gate's output as an output "port"
        return { inputs: { A: a }, outputs: { Y: out, BAD: { gate: buf.gate, input: buf.output } } };
      });
    });
  });
});

describe('instantiateSubcircuit: a single instance behaves like its definition', () => {
  test('a flattened half adder matches the truth table', () => {
    const truth: [SignalState, SignalState, SignalState, SignalState][] = [
      [LOW, LOW, LOW, LOW],
      [LOW, HIGH, HIGH, LOW],
      [HIGH, LOW, HIGH, LOW],
      [HIGH, HIGH, LOW, HIGH],
    ];

    for (const [aVal, bVal, expectedSum, expectedCarry] of truth) {
      const circuit = new CircuitData();
      const extA = createInput(circuit, 'EXT_A');
      const extB = createInput(circuit, 'EXT_B');
      const sumOut = createOutput(circuit, 'EXT_SUM');
      const carryOut = createOutput(circuit, 'EXT_CARRY');

      const inst = instantiateSubcircuit(circuit, halfAdder);
      circuit.connect(extA.output, inst.inputs.A);
      circuit.connect(extB.output, inst.inputs.B);
      circuit.connect(sumOut.input, inst.outputs.SUM);
      circuit.connect(carryOut.input, inst.outputs.CARRY);

      const topology = compileTopology(circuit);
      const sim = new Simulator(circuit, topology);
      sim.setInput(extA.gate, aVal, 0);
      sim.setInput(extB.gate, bVal, 0);
      sim.run();

      assert.equal(sim.readOutput(sumOut.gate), expectedSum, `SUM for ${aVal},${bVal}`);
      assert.equal(sim.readOutput(carryOut.gate), expectedCarry, `CARRY for ${aVal},${bVal}`);
    }
  });

  test('instantiation never mutates the shared definition', () => {
    const before = {
      gates: halfAdder.circuit.gateCount,
      pins: halfAdder.circuit.pinCount,
      nets: halfAdder.circuit.netCount,
    };

    const circuit = new CircuitData();
    instantiateSubcircuit(circuit, halfAdder);
    instantiateSubcircuit(circuit, halfAdder);

    assert.deepEqual(
      { gates: halfAdder.circuit.gateCount, pins: halfAdder.circuit.pinCount, nets: halfAdder.circuit.netCount },
      before,
    );
  });

  test('two instances in the same parent circuit do not share gates, pins, or nets', () => {
    const circuit = new CircuitData();
    const inst1 = instantiateSubcircuit(circuit, halfAdder, 'ha1');
    const inst2 = instantiateSubcircuit(circuit, halfAdder, 'ha2');

    assert.notEqual(inst1.inputs.A, inst2.inputs.A);
    assert.notEqual(inst1.outputs.SUM, inst2.outputs.SUM);
    // Each instance clones the definition's 4 gates (XOR, AND — INPUT_PIN/
    // OUTPUT_PIN boundary gates are dropped during flattening).
    assert.equal(circuit.gateCount, 4);
  });
});

describe('instantiateSubcircuit: composing instances into a larger circuit', () => {
  test('two half-adder instances joined via mergeNets form a full adder', () => {
    // FULL_ADDER(A, B, CIN):
    //   ha1 = HalfAdder(A, B)
    //   ha2 = HalfAdder(ha1.SUM, CIN)
    //   SUM  = ha2.SUM
    //   COUT = ha1.CARRY OR ha2.CARRY
    const truth: [SignalState, SignalState, SignalState, SignalState, SignalState][] = [
      [LOW, LOW, LOW, LOW, LOW],
      [LOW, LOW, HIGH, HIGH, LOW],
      [LOW, HIGH, LOW, HIGH, LOW],
      [LOW, HIGH, HIGH, LOW, HIGH],
      [HIGH, LOW, LOW, HIGH, LOW],
      [HIGH, LOW, HIGH, LOW, HIGH],
      [HIGH, HIGH, LOW, LOW, HIGH],
      [HIGH, HIGH, HIGH, HIGH, HIGH],
    ];

    for (const [aVal, bVal, cinVal, expectedSum, expectedCout] of truth) {
      const circuit = new CircuitData();
      const a = createInput(circuit, 'A');
      const b = createInput(circuit, 'B');
      const cin = createInput(circuit, 'CIN');
      const sumOut = createOutput(circuit, 'SUM');
      const coutOut = createOutput(circuit, 'COUT');

      const ha1 = instantiateSubcircuit(circuit, halfAdder, 'ha1');
      const ha2 = instantiateSubcircuit(circuit, halfAdder, 'ha2');
      const orGate = createOr(circuit, 2);

      circuit.connect(a.output, ha1.inputs.A);
      circuit.connect(b.output, ha1.inputs.B);
      circuit.mergeNets(ha1.outputs.SUM, ha2.inputs.A); // ha1.SUM feeds ha2.A directly
      circuit.connect(cin.output, ha2.inputs.B);
      circuit.connect(sumOut.input, ha2.outputs.SUM);
      circuit.connect(orGate.inputs[0], ha1.outputs.CARRY);
      circuit.connect(orGate.inputs[1], ha2.outputs.CARRY);
      circuit.wire([coutOut.input, orGate.output]);

      const topology = compileTopology(circuit);
      const sim = new Simulator(circuit, topology, { maxEvents: 10_000 });
      sim.setInput(a.gate, aVal, 0);
      sim.setInput(b.gate, bVal, 0);
      sim.setInput(cin.gate, cinVal, 0);
      sim.run();

      assert.equal(sim.readOutput(sumOut.gate), expectedSum, `SUM for ${aVal},${bVal},${cinVal}`);
      assert.equal(sim.readOutput(coutOut.gate), expectedCout, `COUT for ${aVal},${bVal},${cinVal}`);
    }
  });
});

describe('instantiateSubcircuit: nesting (a subcircuit built from other subcircuits)', () => {
  // Defines FullAdder purely in terms of two HalfAdder instances, proving a
  // definition's build function can itself call instantiateSubcircuit.
  const fullAdder = defineSubcircuit('FullAdder', (c) => {
    const a = createInput(c, 'A');
    const b = createInput(c, 'B');
    const cin = createInput(c, 'CIN');
    const sum = createOutput(c, 'SUM');
    const cout = createOutput(c, 'COUT');

    const ha1 = instantiateSubcircuit(c, halfAdder, 'ha1');
    const ha2 = instantiateSubcircuit(c, halfAdder, 'ha2');
    const orGate = createOr(c, 2);

    c.connect(a.output, ha1.inputs.A);
    c.connect(b.output, ha1.inputs.B);
    c.mergeNets(ha1.outputs.SUM, ha2.inputs.A);
    c.connect(cin.output, ha2.inputs.B);
    c.connect(sum.input, ha2.outputs.SUM);
    c.connect(orGate.inputs[0], ha1.outputs.CARRY);
    c.connect(orGate.inputs[1], ha2.outputs.CARRY);
    c.wire([cout.input, orGate.output]);

    return { inputs: { A: a, B: b, CIN: cin }, outputs: { SUM: sum, COUT: cout } };
  });

  test('a 2-bit ripple-carry adder built from two FullAdder instances matches binary addition', () => {
    // bit0 = FullAdder(A0, B0, 0); bit1 = FullAdder(A1, B1, bit0.COUT)
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        const circuit = new CircuitData();
        const a0 = createInput(circuit, 'A0');
        const a1 = createInput(circuit, 'A1');
        const b0 = createInput(circuit, 'B0');
        const b1 = createInput(circuit, 'B1');
        const sum0 = createOutput(circuit, 'SUM0');
        const sum1 = createOutput(circuit, 'SUM1');
        const coutFinal = createOutput(circuit, 'COUT');

        const bit0 = instantiateSubcircuit(circuit, fullAdder, 'bit0');
        const bit1 = instantiateSubcircuit(circuit, fullAdder, 'bit1');
        const tieLowCin = createInput(circuit, 'CIN0_TIE_LOW');

        circuit.connect(a0.output, bit0.inputs.A);
        circuit.connect(b0.output, bit0.inputs.B);
        circuit.connect(tieLowCin.output, bit0.inputs.CIN);
        circuit.connect(sum0.input, bit0.outputs.SUM);

        circuit.connect(a1.output, bit1.inputs.A);
        circuit.connect(b1.output, bit1.inputs.B);
        circuit.mergeNets(bit0.outputs.COUT, bit1.inputs.CIN);
        circuit.connect(sum1.input, bit1.outputs.SUM);
        circuit.connect(coutFinal.input, bit1.outputs.COUT);

        const topology = compileTopology(circuit);
        const sim = new Simulator(circuit, topology, { maxEvents: 10_000 });
        sim.setInput(a0.gate, (a & 1) ? HIGH : LOW, 0);
        sim.setInput(a1.gate, (a & 2) ? HIGH : LOW, 0);
        sim.setInput(b0.gate, (b & 1) ? HIGH : LOW, 0);
        sim.setInput(b1.gate, (b & 2) ? HIGH : LOW, 0);
        sim.setInput(tieLowCin.gate, LOW, 0);
        sim.run();

        const expected = a + b;
        const gotSum0 = sim.readOutput(sum0.gate) === HIGH ? 1 : 0;
        const gotSum1 = sim.readOutput(sum1.gate) === HIGH ? 1 : 0;
        const gotCout = sim.readOutput(coutFinal.gate) === HIGH ? 1 : 0;
        const got = gotSum0 + gotSum1 * 2 + gotCout * 4;

        assert.equal(got, expected, `${a} + ${b} = ${expected}, got ${got}`);
      }
    }
  });
});
