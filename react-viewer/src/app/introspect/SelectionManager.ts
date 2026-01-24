/**
 * SelectionManager.ts - Manages token selection state
 */

export class SelectionManager {
  private _selection: Set<string>;

  constructor() {
    this._selection = new Set();
  }

  getSelection(): string[] {
    return Array.from(this._selection);
  }

  has(regionId: string): boolean {
    return this._selection.has(regionId);
  }

  toggle(regionId: string) {
    if (this._selection.has(regionId)) {
      this._selection.delete(regionId);
    } else {
      this._selection.add(regionId);
    }
  }

  set(regionIds: string[]) {
    this._selection = new Set(regionIds);
  }

  clear() {
    this._selection = new Set();
  }

  get size(): number {
    return this._selection.size;
  }
}
