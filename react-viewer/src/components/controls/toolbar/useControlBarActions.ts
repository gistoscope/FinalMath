/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { appState, getEngineBaseUrl } from "../../../app/core";
import { clearSelection } from "../../../app/features";
import {
  useFormulaState,
  useStoreActions,
} from "../../../store/useViewerStore";

export function useControlBarActions() {
  const { latex } = useFormulaState();
  const { setLatex } = useStoreActions();

  const handleRebuild = useCallback(() => {
    // Re-trigger state to ensure React reconciliation verifies the view
    setLatex(latex);
  }, [latex, setLatex]);

  const handleDownloadJson = useCallback(() => {
    const current = appState.current;
    if (!current) return;
    const data = JSON.stringify(current.serializable, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "surface-map-canonical.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadSession = useCallback(async () => {
    try {
      const res = await fetch(
        `${getEngineBaseUrl()}/debug/step-snapshot/session`,
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `session-log-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert("Failed to download session log: " + e.message);
    }
  }, []);

  const handleResetSession = useCallback(async () => {
    try {
      const res = await fetch(
        `${getEngineBaseUrl()}/debug/step-snapshot/reset`,
        { method: "POST" },
      );
      if (res.ok) alert("Session log reset.");
      else alert("Failed to reset session log.");
    } catch (e: any) {
      console.error(e);
      alert("Failed to reset session log: " + e.message);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    clearSelection("button");
  }, []);

  return {
    handleRebuild,
    handleDownloadJson,
    handleDownloadSession,
    handleResetSession,
    handleClearSelection,
  };
}
