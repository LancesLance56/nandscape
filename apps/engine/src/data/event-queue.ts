import { INITIAL_EVENT_CAPACITY, CAPACITY_GROWTH_FACTOR } from './constants';
import { asPinId, PinId, SignalState, SimTime } from './types';

export interface ScheduledEvent {
  time: SimTime;
  sequence: number;
  pinId: PinId;
  value: SignalState;
  generation: number;
}

export class EventQueue {
  private time: Int32Array;
  private sequence: Int32Array;
  private pinId: Int32Array;
  private value: Int32Array;
  private generation: Int32Array;

  private _size = 0;
  private nextSequence = 0;

  constructor(initialCapacity: number = INITIAL_EVENT_CAPACITY) {
    const cap = Math.max(1, initialCapacity);
    this.time = new Int32Array(cap);
    this.sequence = new Int32Array(cap);
    this.pinId = new Int32Array(cap);
    this.value = new Int32Array(cap);
    this.generation = new Int32Array(cap);
  }

  get size(): number {
    return this._size;
  }

  get isEmpty(): boolean {
    return this._size === 0;
  }

  /** Removes all pending events and resets the sequence counter. */
  clear(): void {
    this._size = 0;
    this.nextSequence = 0;
  }

  /** Schedules a new event and returns the sequence number assigned to it. */
  push(time: SimTime, pinId: PinId, value: SignalState, generation: number): number {
    this.ensureCapacity(this._size + 1);

    const index = this._size;
    const seq = this.nextSequence++;

    this.time[index] = time;
    this.sequence[index] = seq;
    this.pinId[index] = pinId;
    this.value[index] = value;
    this.generation[index] = generation;

    this._size++;
    this.siftUp(index);
    return seq;
  }

  /** Returns the earliest-scheduled event without removing it, or null if empty. */
  peek(): ScheduledEvent | null {
    if (this._size === 0) return null;
    return this.readSlot(0);
  }

  /** Removes and returns the earliest-scheduled event, or null if empty. */
  pop(): ScheduledEvent | null {
    if (this._size === 0) return null;

    const top = this.readSlot(0);
    const lastIndex = this._size - 1;

    if (lastIndex > 0) {
      this.copySlot(lastIndex, 0);
    }
    this._size--;

    if (this._size > 0) {
      this.siftDown(0);
    }

    return top;
  }

  /**
   * Pops and returns ALL events sharing the earliest scheduled time as a
   * single batch (a "delta cycle"). Used by the simulator to apply
   * simultaneous changes together before re-resolving affected nets, which
   * avoids order-dependent glitches when multiple pins settle at the exact
   * same simulation time.
   */
  popBatchAtEarliestTime(): ScheduledEvent[] {
    const batch: ScheduledEvent[] = [];
    const first = this.pop();
    if (first === null) return batch;
    batch.push(first);

    while (this._size > 0) {
      const next = this.peek()!;
      if (next.time !== first.time) break;
      batch.push(this.pop()!);
    }
    return batch;
  }

  // ---------------------------------------------------------------------------
  // Internal heap mechanics
  // ---------------------------------------------------------------------------

  private ensureCapacity(minCapacity: number): void {
    if (minCapacity <= this.time.length) return;
    const grown = Math.ceil(this.time.length * CAPACITY_GROWTH_FACTOR);
    const newCapacity = Math.max(minCapacity, grown, 1);

    const grow = (buf: Int32Array): Int32Array => {
      const next = new Int32Array(newCapacity);
      next.set(buf);
      return next;
    };

    this.time = grow(this.time);
    this.sequence = grow(this.sequence);
    this.pinId = grow(this.pinId);
    this.value = grow(this.value);
    this.generation = grow(this.generation);
  }

  private lessThan(a: number, b: number): boolean {
    if (this.time[a] !== this.time[b]) return this.time[a] < this.time[b];
    return this.sequence[a] < this.sequence[b];
  }

  private readSlot(index: number): ScheduledEvent {
    return {
      time: this.time[index],
      sequence: this.sequence[index],
      pinId: asPinId(this.pinId[index]),
      value: this.value[index] as SignalState,
      generation: this.generation[index],
    };
  }

  private copySlot(from: number, to: number): void {
    this.time[to] = this.time[from];
    this.sequence[to] = this.sequence[from];
    this.pinId[to] = this.pinId[from];
    this.value[to] = this.value[from];
    this.generation[to] = this.generation[from];
  }

  private swap(i: number, j: number): void {
    let tmp: number;
    tmp = this.time[i]; this.time[i] = this.time[j]; this.time[j] = tmp;
    tmp = this.sequence[i]; this.sequence[i] = this.sequence[j]; this.sequence[j] = tmp;
    tmp = this.pinId[i]; this.pinId[i] = this.pinId[j]; this.pinId[j] = tmp;
    tmp = this.value[i]; this.value[i] = this.value[j]; this.value[j] = tmp;
    tmp = this.generation[i]; this.generation[i] = this.generation[j]; this.generation[j] = tmp;
  }

  private siftUp(startIndex: number): void {
    let index = startIndex;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.lessThan(index, parent)) {
        this.swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(startIndex: number): void {
    let index = startIndex;
    for (;;) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      if (left < this._size && this.lessThan(left, smallest)) smallest = left;
      if (right < this._size && this.lessThan(right, smallest)) smallest = right;

      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }
}
