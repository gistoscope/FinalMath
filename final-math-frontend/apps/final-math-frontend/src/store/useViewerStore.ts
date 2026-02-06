import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ViewerStore } from './types';

// Slices

// Enable Map/Set plugin for Immer
enableMapSet();

/**
 * useViewerStore
 * Composed store using manual 'produce' from Immer for maximum type safety
 * and Slice-based file organization for scalability.
 */
export const useStore = create<ViewerStore>()(
  devtools(
    (set) => ({
      latex: String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
      actions: {
        setLatex: (latex: string) => set({ latex }),
      },
    }),
    { name: 'ViewerStore' },
  ),
);

export const useStoreLatex = () => useStore((state) => state.latex);
export const useStoreAction = () => useStore((state) => state.actions);
