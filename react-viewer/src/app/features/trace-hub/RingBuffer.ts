// features/trace-hub/RingBuffer.ts
/**
 * RingBuffer - Fixed-size circular buffer for storing trace events
 */

class RingBuffer<T> {
  private events: T[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50000) {
    this.maxSize = maxSize;
  }

  push(event: T) {
    if (this.events.length >= this.maxSize) {
      this.events.shift();
    }
    this.events.push(event);
  }

  getLastN(n: number): T[] {
    return this.events.slice(-n);
  }

  filter(predicate: (event: T) => boolean): T[] {
    return this.events.filter(predicate);
  }

  getAll(): T[] {
    return [...this.events];
  }

  count(): number {
    return this.events.length;
  }

  clear() {
    this.events = [];
  }
}

export { RingBuffer };
