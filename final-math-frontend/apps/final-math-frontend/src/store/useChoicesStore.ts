import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ChoiceItem {
  id: string;
  label: string;
  primitiveId: string;
  targetNodeId: string;
}

export interface ChoiceState {
  // Formula Actions
  isOpen: boolean;
  choices: ChoiceItem[];
}
export interface ChoiceActions {
  // Formula Actions
  setChoices: (choices: ChoiceItem[]) => void;
  setIsOpen: (isOpen: boolean) => void;
}

export type ChoiceStore = ChoiceState & { actions: ChoiceActions };

export type ChoiceSet = (next: (state: ChoiceStore) => void) => void;

// Enable Map/Set plugin for Immer
enableMapSet();

/**
 * useViewerStore
 * Composed store using manual 'produce' from Immer for maximum type safety
 * and Slice-based file organization for scalability.
 */
export const useChoiceStore = create<ChoiceStore>()(
  devtools(
    (set) => ({
      isOpen: false,
      choices: [],
      actions: {
        setChoices: (choices: ChoiceItem[]) => set({ choices }),
        setIsOpen: (isOpen: boolean) => set({ isOpen }),
      },
    }),
    { name: 'ChoiceStore' },
  ),
);

export const useChoiceIsOpen = () => useChoiceStore((state) => state.isOpen);
export const useChoices = () => useChoiceStore((state) => state.choices);
export const useChoicesActions = () => useChoiceStore((state) => state.actions);
