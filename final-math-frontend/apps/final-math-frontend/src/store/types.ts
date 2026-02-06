export interface ViewerState {
  // Formula Actions
  latex: string;
}
export interface ViewerActions {
  // Formula Actions
  setLatex: (latex: string) => void;
}

export type ViewerStore = ViewerState & { actions: ViewerActions };

export type ViewerSet = (next: (state: ViewerStore) => void) => void;
