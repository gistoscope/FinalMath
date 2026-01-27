import type { SystemState } from "../../types/viewer-state";
import type { ViewerSet } from "../types";

export const initialSystemState: SystemState = {
  logs: [],
  surfaceMapJson: null,
  activeTestId: "0",
};

export const createSystemActions = (set: ViewerSet) => ({
  addLog: (log: string) =>
    set((state) => {
      state.system.logs.push(log);
    }),
  clearLogs: () =>
    set((state) => {
      state.system.logs = [];
    }),
  setSurfaceMap: (surfaceMapJson: unknown) =>
    set((state) => {
      state.system.surfaceMapJson = surfaceMapJson as object | null;
    }),
  setActiveTest: (activeTestId: string) =>
    set((state) => {
      state.system.activeTestId = activeTestId;
    }),
});
