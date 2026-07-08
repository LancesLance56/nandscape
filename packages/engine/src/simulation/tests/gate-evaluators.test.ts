import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { SignalState, EdgeType } from '../../data';
import { SrLatchKind } from '../../data';
import { NetResolutionKind } from '../../data';
import {
  evaluateAnd,
  evaluateNand,
  evaluateOr,
  evaluateNor,
  evaluateXor,
  evaluateXnor,
  evaluateNot,
  evaluateBuffer,
  evaluateTristateBuffer,
  evaluateDLatch,
  evaluateDFlipFlop,
  evaluateSrLatch,
  resolveNet,
  didClockEdgeOccur,
} from '../gate-evaluators';

const { LOW, HIGH, FLOAT, UNKNOWN } = SignalState;

describe('evaluateAnd / evaluateNand', () => {
  test('standard 2-input truth table', () => {
    assert.equal(evaluateAnd([LOW, LOW]), LOW);
    assert.equal(evaluateAnd([LOW, HIGH]), LOW);
    assert.equal(evaluateAnd([HIGH, LOW]), LOW);
    assert.equal(evaluateAnd([HIGH, HIGH]), HIGH);

    assert.equal(evaluateNand([LOW, LOW]), HIGH);
    assert.equal(evaluateNand([LOW, HIGH]), HIGH);
    assert.equal(evaluateNand([HIGH, LOW]), HIGH);
    assert.equal(evaluateNand([HIGH, HIGH]), LOW);
  });

  test('LOW is dominant even against UNKNOWN/FLOAT', () => {
    assert.equal(evaluateAnd([LOW, UNKNOWN]), LOW);
    assert.equal(evaluateAnd([LOW, FLOAT]), LOW);
    assert.equal(evaluateAnd([UNKNOWN, LOW, HIGH]), LOW);
  });

  test('UNKNOWN propagates when no LOW is present', () => {
    assert.equal(evaluateAnd([HIGH, UNKNOWN]), UNKNOWN);
    assert.equal(evaluateAnd([HIGH, FLOAT]), UNKNOWN); // floating input collapses to unknown
    assert.equal(evaluateAnd([UNKNOWN, UNKNOWN]), UNKNOWN);
  });

  test('scales to N-ary inputs', () => {
    assert.equal(evaluateAnd([HIGH, HIGH, HIGH, HIGH]), HIGH);
    assert.equal(evaluateAnd([HIGH, HIGH, LOW, HIGH]), LOW);
  });
});

describe('evaluateOr / evaluateNor', () => {
  test('standard 2-input truth table', () => {
    assert.equal(evaluateOr([LOW, LOW]), LOW);
    assert.equal(evaluateOr([LOW, HIGH]), HIGH);
    assert.equal(evaluateOr([HIGH, HIGH]), HIGH);

    assert.equal(evaluateNor([LOW, LOW]), HIGH);
    assert.equal(evaluateNor([LOW, HIGH]), LOW);
  });

  test('HIGH is dominant even against UNKNOWN/FLOAT', () => {
    assert.equal(evaluateOr([HIGH, UNKNOWN]), HIGH);
    assert.equal(evaluateOr([HIGH, FLOAT]), HIGH);
  });

  test('UNKNOWN propagates when no HIGH is present', () => {
    assert.equal(evaluateOr([LOW, UNKNOWN]), UNKNOWN);
    assert.equal(evaluateOr([LOW, FLOAT]), UNKNOWN);
  });
});

describe('evaluateXor / evaluateXnor', () => {
  test('standard truth table (odd parity)', () => {
    assert.equal(evaluateXor([LOW, LOW]), LOW);
    assert.equal(evaluateXor([LOW, HIGH]), HIGH);
    assert.equal(evaluateXor([HIGH, LOW]), HIGH);
    assert.equal(evaluateXor([HIGH, HIGH]), LOW);
    assert.equal(evaluateXor([HIGH, HIGH, HIGH]), HIGH); // 3-input parity

    assert.equal(evaluateXnor([HIGH, HIGH]), HIGH);
    assert.equal(evaluateXnor([LOW, HIGH]), LOW);
  });

  test('any UNKNOWN/FLOAT input makes the result UNKNOWN (no dominance)', () => {
    assert.equal(evaluateXor([HIGH, UNKNOWN]), UNKNOWN);
    assert.equal(evaluateXor([LOW, FLOAT]), UNKNOWN);
  });
});

describe('evaluateNot / evaluateBuffer', () => {
  test('inverts defined levels', () => {
    assert.equal(evaluateNot(LOW), HIGH);
    assert.equal(evaluateNot(HIGH), LOW);
  });

  test('UNKNOWN/FLOAT input yields UNKNOWN output', () => {
    assert.equal(evaluateNot(UNKNOWN), UNKNOWN);
    assert.equal(evaluateNot(FLOAT), UNKNOWN);
  });

  test('buffer passes defined levels through, collapses FLOAT to UNKNOWN', () => {
    assert.equal(evaluateBuffer(HIGH), HIGH);
    assert.equal(evaluateBuffer(LOW), LOW);
    assert.equal(evaluateBuffer(FLOAT), UNKNOWN);
  });
});

describe('evaluateTristateBuffer', () => {
  test('enabled: passes data through', () => {
    assert.equal(evaluateTristateBuffer(HIGH, HIGH), HIGH);
    assert.equal(evaluateTristateBuffer(LOW, HIGH), LOW);
  });

  test('disabled: releases to FLOAT regardless of data', () => {
    assert.equal(evaluateTristateBuffer(HIGH, LOW), FLOAT);
    assert.equal(evaluateTristateBuffer(LOW, LOW), FLOAT);
  });

  test('unknown enable: output is UNKNOWN (can\'t tell if driving)', () => {
    assert.equal(evaluateTristateBuffer(HIGH, UNKNOWN), UNKNOWN);
    assert.equal(evaluateTristateBuffer(HIGH, FLOAT), UNKNOWN);
  });
});

describe('evaluateDLatch', () => {
  test('transparent while enabled: output follows data', () => {
    assert.deepEqual(evaluateDLatch(HIGH, HIGH, LOW), { q: HIGH, qn: LOW });
    assert.deepEqual(evaluateDLatch(LOW, HIGH, HIGH), { q: LOW, qn: HIGH });
  });

  test('holds previous value while disabled', () => {
    assert.deepEqual(evaluateDLatch(HIGH, LOW, LOW), { q: LOW, qn: HIGH });
    assert.deepEqual(evaluateDLatch(LOW, LOW, HIGH), { q: HIGH, qn: LOW });
  });

  test('unknown enable makes both outputs unknown', () => {
    assert.deepEqual(evaluateDLatch(HIGH, UNKNOWN, LOW), { q: UNKNOWN, qn: UNKNOWN });
  });
});

describe('evaluateDFlipFlop', () => {
  test('captures data only when a clock edge occurred', () => {
    const captured = evaluateDFlipFlop({
      data: HIGH,
      reset: LOW,
      set: LOW,
      clockEdgeOccurred: true,
      previousQ: LOW,
    });
    assert.deepEqual(captured, { q: HIGH, qn: LOW });

    const held = evaluateDFlipFlop({
      data: HIGH,
      reset: LOW,
      set: LOW,
      clockEdgeOccurred: false,
      previousQ: LOW,
    });
    assert.deepEqual(held, { q: LOW, qn: HIGH }); // no edge -> holds
  });

  test('asynchronous reset/set override the clock', () => {
    const reset = evaluateDFlipFlop({
      data: HIGH,
      reset: HIGH,
      set: LOW,
      clockEdgeOccurred: true,
      previousQ: HIGH,
    });
    assert.deepEqual(reset, { q: LOW, qn: HIGH });

    const set = evaluateDFlipFlop({
      data: LOW,
      reset: LOW,
      set: HIGH,
      clockEdgeOccurred: true,
      previousQ: LOW,
    });
    assert.deepEqual(set, { q: HIGH, qn: LOW });
  });

  test('reset and set both asserted is an invalid configuration -> UNKNOWN', () => {
    const both = evaluateDFlipFlop({
      data: HIGH,
      reset: HIGH,
      set: HIGH,
      clockEdgeOccurred: false,
      previousQ: LOW,
    });
    assert.deepEqual(both, { q: UNKNOWN, qn: UNKNOWN });
  });
});

describe('evaluateSrLatch', () => {
  test('NOR-based (active-HIGH) set/reset/hold', () => {
    assert.deepEqual(
      evaluateSrLatch({ s: HIGH, r: LOW, kind: SrLatchKind.NOR_BASED, previousQ: LOW }),
      { q: HIGH, qn: LOW },
    );
    assert.deepEqual(
      evaluateSrLatch({ s: LOW, r: HIGH, kind: SrLatchKind.NOR_BASED, previousQ: HIGH }),
      { q: LOW, qn: HIGH },
    );
    assert.deepEqual(
      evaluateSrLatch({ s: LOW, r: LOW, kind: SrLatchKind.NOR_BASED, previousQ: HIGH }),
      { q: HIGH, qn: LOW }, // hold
    );
  });

  test('forbidden state (both asserted) yields UNKNOWN for both outputs', () => {
    assert.deepEqual(
      evaluateSrLatch({ s: HIGH, r: HIGH, kind: SrLatchKind.NOR_BASED, previousQ: LOW }),
      { q: UNKNOWN, qn: UNKNOWN },
    );
  });

  test('NAND-based (active-LOW) set/reset/hold', () => {
    assert.deepEqual(
      evaluateSrLatch({ s: LOW, r: HIGH, kind: SrLatchKind.NAND_BASED, previousQ: LOW }),
      { q: HIGH, qn: LOW },
    );
    assert.deepEqual(
      evaluateSrLatch({ s: HIGH, r: LOW, kind: SrLatchKind.NAND_BASED, previousQ: HIGH }),
      { q: LOW, qn: HIGH },
    );
    assert.deepEqual(
      evaluateSrLatch({ s: HIGH, r: HIGH, kind: SrLatchKind.NAND_BASED, previousQ: HIGH }),
      { q: HIGH, qn: LOW }, // both de-asserted (active-LOW, so HIGH=inactive) -> hold
    );
  });
});

describe('resolveNet', () => {
  test('zero active drivers resolves to FLOAT / UNDRIVEN', () => {
    const r = resolveNet([]);
    assert.equal(r.state, FLOAT);
    assert.equal(r.kind, NetResolutionKind.UNDRIVEN);
  });

  test('an all-FLOAT driver set (e.g. every tri-state buffer disabled) is also UNDRIVEN', () => {
    const r = resolveNet([FLOAT, FLOAT, FLOAT]);
    assert.equal(r.state, FLOAT);
    assert.equal(r.kind, NetResolutionKind.UNDRIVEN);
  });

  test('single active driver wins outright', () => {
    const r = resolveNet([HIGH]);
    assert.equal(r.state, HIGH);
    assert.equal(r.kind, NetResolutionKind.SINGLE_DRIVER);
  });

  test('single active driver among floating ones still resolves cleanly', () => {
    const r = resolveNet([FLOAT, LOW, FLOAT]);
    assert.equal(r.state, LOW);
    assert.equal(r.kind, NetResolutionKind.SINGLE_DRIVER);
  });

  test('multiple agreeing drivers resolve to that value', () => {
    const r = resolveNet([HIGH, HIGH]);
    assert.equal(r.state, HIGH);
    assert.equal(r.kind, NetResolutionKind.AGREEMENT);
  });

  test('multiple disagreeing drivers is bus contention -> UNKNOWN', () => {
    const r = resolveNet([HIGH, LOW]);
    assert.equal(r.state, UNKNOWN);
    assert.equal(r.kind, NetResolutionKind.CONTENTION);
  });
});

describe('didClockEdgeOccur', () => {
  test('detects rising and falling edges correctly', () => {
    assert.equal(didClockEdgeOccur(LOW, HIGH, EdgeType.RISING), true);
    assert.equal(didClockEdgeOccur(LOW, HIGH, EdgeType.FALLING), false);
    assert.equal(didClockEdgeOccur(HIGH, LOW, EdgeType.FALLING), true);
    assert.equal(didClockEdgeOccur(HIGH, LOW, EdgeType.RISING), false);
    assert.equal(didClockEdgeOccur(LOW, HIGH, EdgeType.ANY), true);
    assert.equal(didClockEdgeOccur(HIGH, LOW, EdgeType.ANY), true);
  });

  test('no edge when the level did not change, or transition involves X/Z', () => {
    assert.equal(didClockEdgeOccur(HIGH, HIGH, EdgeType.ANY), false);
    assert.equal(didClockEdgeOccur(UNKNOWN, HIGH, EdgeType.ANY), false);
    assert.equal(didClockEdgeOccur(FLOAT, HIGH, EdgeType.ANY), false);
  });
});
