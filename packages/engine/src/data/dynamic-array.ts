import { CAPACITY_GROWTH_FACTOR } from './constants';

export type TypedArrayConstructor =
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Uint8ArrayConstructor
  | Float64ArrayConstructor;

export class DynamicTypedArray<C extends TypedArrayConstructor> {
  private ctor: C;
  private buffer: InstanceType<C>;
  private _length: number;

  constructor(ctor: C, initialCapacity: number = 16) {
    this.ctor = ctor;
    this.buffer = new ctor(Math.max(1, initialCapacity)) as InstanceType<C>;
    this._length = 0;
  }

  /** Number of logically valid elements (not the underlying buffer capacity). */
  get length(): number {
    return this._length;
  }

  /** Current allocated capacity of the backing buffer. */
  get capacity(): number {
    return this.buffer.length;
  }

  get(index: number): number {
    return this.buffer[index];
  }

  set(index: number, value: number): void {
    if (index < 0 || index >= this._length) {
      throw new RangeError(
        `DynamicTypedArray.set: index ${index} out of bounds (length ${this._length})`,
      );
    }
    this.buffer[index] = value;
  }

  /** Appends a value, growing the backing buffer if necessary. Returns the index it was written to. */
  push(value: number): number {
    if (this._length >= this.buffer.length) {
      this.grow(this._length + 1);
    }
    const index = this._length;
    this.buffer[index] = value;
    this._length++;
    return index;
  }

  /** Ensures capacity for at least `minCapacity` elements, growing if needed. */
  ensureCapacity(minCapacity: number): void {
    if (minCapacity > this.buffer.length) {
      this.grow(minCapacity);
    }
  }

  private grow(minCapacity: number): void {
    const grownCapacity = Math.ceil(this.buffer.length * CAPACITY_GROWTH_FACTOR);
    const newCapacity = Math.max(minCapacity, grownCapacity, 1);
    const newBuffer = new this.ctor(newCapacity) as InstanceType<C>;
    newBuffer.set(this.buffer as unknown as ArrayLike<number>);
    this.buffer = newBuffer;
  }

  /** A zero-copy view containing exactly the valid (non-garbage) elements. */
  view(): InstanceType<C> {
    return this.buffer.subarray(0, this._length) as InstanceType<C>;
  }

  /** Resets logical length to zero without releasing the backing buffer. */
  clear(): void {
    this._length = 0;
  }

  /** Fills every logically-valid slot with `value`. */
  fill(value: number): void {
    this.buffer.fill(value, 0, this._length);
  }

  toArray(): number[] {
    return Array.from(this.view());
  }
}
