import { SurfaceNodeMap } from "@/lib/surface-map";
import { create } from "zustand";

export const TESTS = [
  String.raw`\frac{1}{7} + \frac{3}{7}`,
  String.raw`\frac{5}{9} - \frac{2}{9}`,
  String.raw`2+3`,
  String.raw`\frac{1}{3}+\frac{2}{5}`,
  String.raw`\frac{1}{1+\frac{1}{2}}`,
  String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
  String.raw`12.5 + 0.75 - 3.125`,
  String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
  String.raw`2 + 3 - 1`,
  String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
  String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
  String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
  String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
  String.raw`1.2 + \frac{3}{5} - 0.4`,
  String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
  String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
];

export interface ModeConfig {
  mode: number;
  color: string;
  label: string;
  primitiveId: string | null;
}

export const MODE_CONFIG: ModeConfig[] = [
  { mode: 0, color: "#4CAF50", label: "Selected", primitiveId: null },
  {
    mode: 1,
    color: "#FF9800",
    label: "Convert to fraction",
    primitiveId: "P.INT_TO_FRAC",
  },
  {
    mode: 2,
    color: "#2196F3",
    label: "Convert 1 → target denom",
    primitiveId: "P.ONE_TO_TARGET_DENOM",
  },
];

export interface HintIndicatorState {
  visible: boolean;
  x?: number;
  y?: number;
  label: string;
  color: string;
  onClick: () => void;
}

export interface VisualizerState {
  latex: string;
  testIndex: number;
  surfaceMap: SurfaceNodeMap | null;
  hintIndicator: HintIndicatorState | null;

  // Actions
  setLatex: (latex: string) => void;
  setTestIndex: (index: number) => void;
  setSurfaceMap: (map: SurfaceNodeMap | null) => void;
  setHintIndicator: (indicator: HintIndicatorState | null) => void;
  resetMapState: () => void;
}

export const useVisualizerStore = create<VisualizerState>((set) => ({
  latex: TESTS[0],
  testIndex: 0,
  surfaceMap: null,
  hintIndicator: null,

  setLatex: (latex) => set({ latex }),
  setTestIndex: (testIndex) => set({ testIndex }),
  setSurfaceMap: (surfaceMap) => set({ surfaceMap }),
  setHintIndicator: (hintIndicator) => set({ hintIndicator }),
  resetMapState: () =>
    set({
      hintIndicator: null,
    }),
}));
