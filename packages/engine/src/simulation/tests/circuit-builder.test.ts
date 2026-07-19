import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { CircuitData } from '../../data';
import { GateType, PinDirection } from '../../data';
import { compileTopology, validateCircuit } from '../compiler';
import { createInput, createOutput, createNand, createNot } from '../builder';

describe('CircuitData construction', () => {
  test('addGate allocates contiguous pins and correct default delay', () => {
    const circuit = new CircuitData();
    const nand = createNand(circuit, 2);
    assert.equal(circuit.gateCount, 1);
    assert.equal(circuit.pinCount, 3); // 2 inputs + 1 output
    assert.equal(circuit.gateDelay.get(nand.gate), 1); // DEFAULT_GATE_DELAY[NAND]
    assert.equal(circuit.pinDirection.get(nand.inputs[0]), PinDirection.INPUT);
    assert.equal(circuit.pinDirection.get(nand.output), PinDirection.OUTPUT);
  });

  test('multiple gates get non-overlapping pin ranges', () => {
    const circuit = new CircuitData();
    const g1 = createNand(circuit, 2);
    const g2 = createNot(circuit);
    assert.equal(circuit.gatePinStart.get(g2.gate), circuit.gatePinStart.get(g1.gate) + circuit.gatePinCount.get(g1.gate));
  });

  test('wire() connects multiple pins to one shared net', () => {
    const circuit = new CircuitData();
    const src = createInput(circuit, 'A');
    const g1 = createNot(circuit);
    const g2 = createNot(circuit);
    const net = circuit.wire([src.output, g1.input, g2.input], 'net_A');
    assert.equal(circuit.pinNet.get(src.output), net);
    assert.equal(circuit.pinNet.get(g1.input), net);
    assert.equal(circuit.pinNet.get(g2.input), net);
  });

  test('pinOf throws for an out-of-range role', () => {
    const circuit = new CircuitData();
    const g = createNot(circuit);
    assert.throws(() => circuit.pinOf(g.gate, 99));
  });
});

describe('validateCircuit', () => {
  test('flags unconnected pins', () => {
    const circuit = new CircuitData();
    createNot(circuit); // pins left dangling on purpose
    const issues = validateCircuit(circuit);
    assert.ok(issues.length >= 2); // both the input and output pin are unconnected
  });

  test('flags nets with zero connected pins', () => {
    const circuit = new CircuitData();
    circuit.addNet('orphan');
    const issues = validateCircuit(circuit);
    assert.ok(issues.some((i) => i.message.includes('has no pins connected')));
  });

  test('a fully-wired circuit has no issues', () => {
    const circuit = new CircuitData();
    const a = createInput(circuit, 'A');
    const out = createOutput(circuit, 'Y');
    circuit.wire([a.output, out.input]);
    assert.deepEqual(validateCircuit(circuit), []);
  });
});

describe('compileTopology', () => {
  test('throws on an invalid (unconnected) circuit', () => {
    const circuit = new CircuitData();
    createNot(circuit);
    assert.throws(() => compileTopology(circuit));
  });

  test('produces correct driver/fanout CSR for a simple NAND circuit', () => {
    const circuit = new CircuitData();
    const a = createInput(circuit, 'A');
    const b = createInput(circuit, 'B');
    const nand = createNand(circuit, 2);
    const out = createOutput(circuit, 'Y');

    const netA = circuit.wire([a.output, nand.inputs[0]]);
    const netB = circuit.wire([b.output, nand.inputs[1]]);
    const netY = circuit.wire([nand.output, out.input]);

    const topology = compileTopology(circuit);

    assert.equal(topology.driverCount(netA), 1);
    assert.equal(topology.fanoutCount(netA), 1);
    assert.deepEqual([...topology.fanoutGates(netA)], [nand.gate]);

    assert.equal(topology.driverCount(netB), 1);
    assert.equal(topology.fanoutCount(netB), 1);

    assert.equal(topology.driverCount(netY), 1);
    assert.equal(topology.fanoutCount(netY), 1);
    assert.deepEqual([...topology.fanoutGates(netY)], [out.gate]);
  });

  test('fanout is deduplicated when a gate has two inputs tied to the same net', () => {
    const circuit = new CircuitData();
    const a = createInput(circuit, 'A');
    const and = createNand(circuit, 2); // both inputs will be tied to the same net
    const out = createOutput(circuit, 'Y');

    const netA = circuit.wire([a.output, and.inputs[0], and.inputs[1]]);
    circuit.wire([and.output, out.input]);

    const topology = compileTopology(circuit);
    assert.equal(topology.fanoutCount(netA), 1); // deduplicated, not 2
  });

  test('a net with multiple drivers (bus) reports the correct driver count', () => {
    const circuit = new CircuitData();
    const a = circuit.addGate({ type: GateType.CONSTANT, paramA: 1 });
    const b = circuit.addGate({ type: GateType.CONSTANT, paramA: 0 });
    const out = createOutput(circuit, 'BUS');

    const pinA = circuit.pinOf(a, 0);
    const pinB = circuit.pinOf(b, 0);
    const bus = circuit.wire([pinA, pinB, out.input]);

    const topology = compileTopology(circuit);
    assert.equal(topology.driverCount(bus), 2);
  });
});
