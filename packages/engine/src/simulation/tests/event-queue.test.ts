/**
 * Tests for the binary min-heap event queue (data/event-queue.ts):
 * time-ordering, FIFO tie-breaking, batch extraction, and growth beyond
 * initial capacity.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { EventQueue } from '../../data/event-queue';
import { SignalState } from '../../data/types';

describe('EventQueue', () => {
  test('pops events in ascending time order', () => {
    const q = new EventQueue();
    q.push(5, 0 as any, SignalState.HIGH, 1);
    q.push(1, 1 as any, SignalState.LOW, 1);
    q.push(3, 2 as any, SignalState.HIGH, 1);

    assert.equal(q.pop()!.time, 1);
    assert.equal(q.pop()!.time, 3);
    assert.equal(q.pop()!.time, 5);
    assert.equal(q.pop(), null);
  });

  test('events at the same time pop in FIFO (sequence) order', () => {
    const q = new EventQueue();
    q.push(10, 0 as any, SignalState.HIGH, 1);
    q.push(10, 1 as any, SignalState.LOW, 1);
    q.push(10, 2 as any, SignalState.HIGH, 1);

    assert.equal(q.pop()!.pinId, 0);
    assert.equal(q.pop()!.pinId, 1);
    assert.equal(q.pop()!.pinId, 2);
  });

  test('peek does not remove', () => {
    const q = new EventQueue();
    q.push(1, 0 as any, SignalState.HIGH, 1);
    assert.equal(q.peek()!.time, 1);
    assert.equal(q.size, 1);
    assert.equal(q.peek()!.time, 1);
    assert.equal(q.size, 1);
  });

  test('popBatchAtEarliestTime groups all events sharing the earliest time', () => {
    const q = new EventQueue();
    q.push(5, 0 as any, SignalState.HIGH, 1);
    q.push(5, 1 as any, SignalState.LOW, 1);
    q.push(7, 2 as any, SignalState.HIGH, 1);

    const batch = q.popBatchAtEarliestTime();
    assert.equal(batch.length, 2);
    assert.ok(batch.every((e) => e.time === 5));
    assert.equal(q.size, 1);
    assert.equal(q.peek()!.time, 7);
  });

  test('popBatchAtEarliestTime on an empty queue returns an empty array', () => {
    const q = new EventQueue();
    assert.deepEqual(q.popBatchAtEarliestTime(), []);
  });

  test('maintains heap correctness under interleaved push/pop beyond initial capacity', () => {
    const q = new EventQueue(4); // deliberately tiny initial capacity to force growth
    const times = [50, 3, 42, 17, 8, 91, 1, 23, 6, 77, 2, 99, 14, 5, 60];
    for (let i = 0; i < times.length; i++) {
      q.push(times[i], i as any, SignalState.HIGH, 1);
    }
    const popped: number[] = [];
    while (!q.isEmpty) {
      popped.push(q.pop()!.time);
    }
    const expected = [...times].sort((a, b) => a - b);
    assert.deepEqual(popped, expected);
  });

  test('clear() empties the queue and resets sequence numbering', () => {
    const q = new EventQueue();
    q.push(1, 0 as any, SignalState.HIGH, 1);
    q.push(2, 1 as any, SignalState.LOW, 1);
    q.clear();
    assert.equal(q.size, 0);
    assert.equal(q.isEmpty, true);
    const seq = q.push(1, 0 as any, SignalState.HIGH, 1);
    assert.equal(seq, 0); // sequence counter restarted
  });

  test('generation is stored and retrievable per event', () => {
    const q = new EventQueue();
    q.push(1, 0 as any, SignalState.HIGH, 42);
    assert.equal(q.pop()!.generation, 42);
  });
});
