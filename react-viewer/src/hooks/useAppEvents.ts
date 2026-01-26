import { useCallback } from "react";
import { getEngineBaseUrl } from "../app/core/api.js";
import { appState, setCurrentLatex, TESTS } from "../app/core/state.js";
import { clearSelection } from "../app/features/selection/selection-manager.js";
import { useViewerStore } from "../store/useViewerStore";

export function useAppEvents(
  eventRecorder: { download: () => void },
  fileBus: { getHistory: () => any[] },
) {
  const latex = useViewerStore((state) => state.formula.latex);
  const manualInput = useViewerStore((state) => state.formula.manualInput);
  const { setLatex, setActiveTest } = useViewerStore((state) => state.actions);

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

  const handleDownloadEvents = useCallback(() => {
    eventRecorder.download();
  }, [eventRecorder]);

  const handleDownloadBus = useCallback(() => {
    const history = fileBus.getHistory();
    if (!history || history.length === 0) {
      console.warn("[FileBus] No messages to download");
      return;
    }
    const lines = history.map((msg: any) => JSON.stringify(msg));
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filebus-messages.jsonl";
    a.click();
    URL.revokeObjectURL(url);
  }, [fileBus]);

  const handleDownloadSnapshot = useCallback(async () => {
    try {
      const res = await fetch(
        `${getEngineBaseUrl()}/debug/step-snapshot/latest`,
      );
      if (res.status === 404) {
        alert("No step snapshot available (perform a step first).");
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `step-snapshot-${json.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert("Failed to download snapshot: " + e.message);
    }
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

  const handleTestChange = useCallback(
    (value: string) => {
      setActiveTest(value);
      const idx = parseInt(value, 10) || 0;
      const newLatex = (TESTS as string[])[
        Math.max(0, Math.min(TESTS.length - 1, idx))
      ];
      setCurrentLatex(newLatex);
      setLatex(newLatex);
      clearSelection("latex-changed");
    },
    [setActiveTest, setLatex],
  );

  const handleLoadLatex = useCallback(() => {
    const value = manualInput.trim();
    if (!value) return;
    setCurrentLatex(value);
    setLatex(value);
    clearSelection("latex-changed");
  }, [manualInput, setLatex]);

  const handleClearSelection = useCallback(() => {
    clearSelection("button");
  }, []);

  return {
    handleRebuild,
    handleDownloadJson,
    handleDownloadEvents,
    handleDownloadBus,
    handleDownloadSnapshot,
    handleDownloadSession,
    handleResetSession,
    handleTestChange,
    handleLoadLatex,
    handleClearSelection,
  };
}
