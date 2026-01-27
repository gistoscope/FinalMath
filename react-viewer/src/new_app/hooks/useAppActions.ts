/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { DebugClient } from "../core/api/clients/DebugClient";
import { Tokens } from "../di/tokens";
import { ExportService } from "../features/exporting/ExportService";
import type { IStoreService } from "../store/interfaces/IStoreService";
import { useService } from "../useService";

export function useAppActions() {
  const store = useService<IStoreService>(Tokens.IStoreService);
  const debugClient = useService<DebugClient>(DebugClient);
  const exportService = useService<ExportService>(ExportService);

  const handleDownloadSnapshot = useCallback(async () => {
    try {
      const snapshot = await debugClient.getLatestSnapshot();
      exportService.downloadJson(snapshot, "step-snapshot.json");
    } catch (e: any) {
      alert("Failed to download snapshot: " + e.message);
    }
  }, [debugClient, exportService]);

  const handleDownloadSession = useCallback(async () => {
    try {
      const log = await debugClient.getSessionLog();
      exportService.downloadJson(log, "session-log.json");
    } catch (e: any) {
      alert("Failed to download session: " + e.message);
    }
  }, [debugClient, exportService]);

  const handleResetSession = useCallback(async () => {
    try {
      await debugClient.resetSession();
      alert("Session reset.");
    } catch (e: any) {
      alert("Failed to reset session: " + e.message);
    }
  }, [debugClient]);

  const handleLoadLatex = useCallback(
    (latex: string) => {
      store.setLatex(latex);
    },
    [store],
  );

  return {
    handleDownloadSnapshot,
    handleDownloadSession,
    handleResetSession,
    handleLoadLatex,
    handleRebuild: () => handleLoadLatex(store.getLatex()),
    handleDownloadJson: () =>
      exportService.downloadJson(store.getSurfaceMap(), "surface-map.json"),
    handleDownloadEvents: () => {
      // TraceRecorder isn't exported directly from hooks, we can inject it or just rely on legacy mechanism if trace recorder is wired up.
      // But let's inject TraceRecorder if we can.
      // Actually, TraceRecorder is registered as Tokens.ITraceRecorder.
      alert("Trace download not implemented in this version yet.");
    },
    handleDownloadBus: () => alert("Bus download not implemented yet."),
    handleClearSelection: () =>
      store.updateSelection({
        mode: "none",
        primaryId: null,
        selectedIds: new Set(),
      }),
  };
}
