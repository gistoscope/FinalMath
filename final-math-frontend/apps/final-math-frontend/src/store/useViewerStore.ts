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
      latex: String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
      actions: {
        setLatex: (latex: string) => set({ latex }),
      },
    }),
    { name: 'ViewerStore' },
  ),
);

export const useStoreLatex = () => useStore((state) => state.latex);
export const useStoreAction = () => useStore((state) => state.actions);
