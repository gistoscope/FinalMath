/**
 * RingBuffer - Fixed-size circular buffer for storing trace events
 *
 * When the buffer reaches capacity, oldest events are automatically removed.
 */

class RingBuffer {
  /**
   * Create a new ring buffer
   * @param {number} [maxSize=50000] - Maximum number of events to store
   */
  constructor(maxSize = 50000) {
    this.events = [];
    this.maxSize = maxSize;
  }

  /**
   * Add an event to the buffer
   * If at capacity, removes the oldest event first
   * @param {Object} event - The event to add
   */
  push(event) {
    if (this.events.length >= this.maxSize) {
      this.events.shift();
    }
    this.events.push(event);
  }

  /**
   * Get the last N events
   * @param {number} n - Number of events to retrieve
   * @returns {Array} The last N events
   */
  getLastN(n) {
    return this.events.slice(-n);
  }

  /**
   * Get all events matching a predicate
   * @param {Function} predicate - Filter function
   * @returns {Array} Matching events
   */
  filter(predicate) {
    return this.events.filter(predicate);
  }

  /**
   * Get all events (shallow copy)
   * @returns {Array} All stored events
   */
  getAll() {
    return [...this.events];
  }

  /**
   * Get the number of stored events
   * @returns {number} Event count
   */
  count() {
    return this.events.length;
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
  }
}

export { RingBuffer };
