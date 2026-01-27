/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * IStoreService.ts
 * Interface for accessing and updating the global application state.
 */

export interface IStoreService {
  // Formula
  getLatex(): string;
  setLatex(latex: string): void;
  setIsRendering(isRendering: boolean): void;

  // Selection
  getSelection(): {
    mode: string;
    primaryId: string | null;
    selectedIds: Set<string>;
  };
  updateSelection(selection: {
    mode?: string;
    primaryId?: string | null;
    selectedIds?: Set<string>;
  }): void;

  // Drag
  getDrag(): {
    isDragging: boolean;
    dragStart: { x: number; y: number } | null;
    dragEnd: { x: number; y: number } | null;
  };
  updateDrag(drag: {
    isDragging?: boolean;
    dragStart?: { x: number; y: number } | null;
    dragEnd?: { x: number; y: number } | null;
  }): void;

  // Surface Map
  setSurfaceMap(mapJson: any): void;
  getSurfaceMap(): any;

  // Hover
  updateHover(hover: {
    target?: string | null;
    lastClick?: string | null;
  }): void;

  // Interaction State
  updateOperatorSelection(operatorSelection: any): void;
  getOperatorSelection(): any;

  // Integer Cycle
  updateIntegerCycle(cycle: any): void;
  getIntegerCycle(): any;

  // New - Engine & TSA
  updateEngine(engine: {
    lastClientEvent?: unknown | null;
    lastEngineRequest?: unknown | null;
    lastEngineResponse?: unknown | null;
  }): void;
  updateTsa(tsa: { lastTsa?: unknown | null; log?: unknown[] }): void;
  updateStepHint(hint: string | null): void;

  updateP1Diagnostics(diagnostics: any): void;

  // System
  addLog(message: string): void;
}
