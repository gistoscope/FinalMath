/**
 * SelectionManager.js - Manages token selection state
 */

/**
 * SelectionManager - Manages token selection state.
 */
export class SelectionManager {
  constructor() {
    /** @type {Set<string>} */
    this._selection = new Set();
  }

  /**
   * Get current selection as array.
   * @returns {string[]}
   */
  getSelection() {
    return Array.from(this._selection);
  }

  /**
   * Check if a region is selected.
   * @param {string} regionId
   * @returns {boolean}
   */
  has(regionId) {
    return this._selection.has(regionId);
  }

  /**
   * Toggle selection of a region.
   * @param {string} regionId
   */
  toggle(regionId) {
    if (this._selection.has(regionId)) {
      this._selection.delete(regionId);
    } else {
      this._selection.add(regionId);
    }
  }

  /**
   * Set selection to specific regions.
   * @param {string[]} regionIds
   */
  set(regionIds) {
    this._selection = new Set(regionIds);
  }

  /**
   * Clear all selections.
   */
  clear() {
    this._selection = new Set();
  }

  /**
   * Get selection count.
   * @returns {number}
   */
  get size() {
    return this._selection.size;
  }
}
