// features/events/button-handlers.js
// Button click handlers for the viewer

import { getEngineBaseUrl } from "../../core/api.js";
import { appState, setCurrentLatex, TESTS } from "../../core/state.js";
import { clearSelection } from "../selection/selection-manager.js";

/**
 * Setup button handlers
 * @param {object} options - Options object
 * @param {Function} options.renderFormula - Render formula function
 * @param {Function} options.buildAndShowMap - Build and show map function
 * @param {object} options.eventRecorder - Event recorder instance
 * @param {object} options.fileBus - FileBus instance
 */
export function setupButtonHandlers({
  renderFormula,
  buildAndShowMap,
  eventRecorder,
  fileBus,
}) {
  const btnRebuild = document.getElementById("btn-rebuild");
  const btnDownload = document.getElementById("btn-download");
  const btnDownloadEvents = document.getElementById("btn-download-events");
  const btnDownloadBus = document.getElementById("btn-download-bus");

  if (btnRebuild) {
    btnRebuild.addEventListener("click", () => {
      renderFormula();
      buildAndShowMap();
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      if (!appState.current) return;
      const data = JSON.stringify(appState.current.serializable, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "surface-map-canonical.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnDownloadEvents) {
    btnDownloadEvents.addEventListener("click", () => {
      eventRecorder.download();
    });
  }

  if (btnDownloadBus) {
    btnDownloadBus.addEventListener("click", () => {
      const history = fileBus.getHistory();
      if (!history || history.length === 0) {
        console.warn("[FileBus] No messages to download");
        return;
      }
      const lines = history.map((msg) => JSON.stringify(msg));
      const blob = new Blob([lines.join("\n") + "\n"], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filebus-messages.jsonl";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnDownloadSnapshot = document.getElementById("btn-download-snapshot");
  if (btnDownloadSnapshot) {
    btnDownloadSnapshot.addEventListener("click", async () => {
      try {
        const res = await fetch(
          `${getEngineBaseUrl()}/debug/step-snapshot/latest`,
        );
        if (res.status === 404) {
          alert("No step snapshot available (perform a step first).");
          return;
        }
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
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
      } catch (e) {
        console.error(e);
        alert("Failed to download snapshot: " + e.message);
      }
    });
  }

  const btnDownloadSession = document.getElementById("btn-download-session");
  if (btnDownloadSession) {
    btnDownloadSession.addEventListener("click", async () => {
      try {
        const res = await fetch(
          `${getEngineBaseUrl()}/debug/step-snapshot/session`,
        );
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
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
      } catch (e) {
        console.error(e);
        alert("Failed to download session log: " + e.message);
      }
    });
  }

  const btnResetSession = document.getElementById("btn-reset-session");
  if (btnResetSession) {
    btnResetSession.addEventListener("click", async () => {
      try {
        const res = await fetch(
          `${getEngineBaseUrl()}/debug/step-snapshot/reset`,
          { method: "POST" },
        );
        if (res.ok) {
          alert("Session log reset.");
        } else {
          alert("Failed to reset session log.");
        }
      } catch (e) {
        console.error(e);
        alert("Failed to reset session log: " + e.message);
      }
    });
  }

  // Test selector
  const select = document.getElementById("test-select");
  if (select) {
    select.addEventListener("change", () => {
      const idx = parseInt(select.value, 10) || 0;
      setCurrentLatex(TESTS[Math.max(0, Math.min(TESTS.length - 1, idx))]);
      clearSelection("latex-changed");
      renderFormula();
      buildAndShowMap();
    });
  }

  // Manual LaTeX input
  const manualInput = document.getElementById("manual-latex-input");
  const btnLoadLatex = document.getElementById("btn-load-latex");
  if (manualInput && btnLoadLatex) {
    btnLoadLatex.addEventListener("click", () => {
      const value = manualInput.value.trim();
      if (!value) return;
      setCurrentLatex(value);
      clearSelection("latex-changed");
      renderFormula();
      buildAndShowMap();
    });
  }

  // Explicit Clear Selection Button
  const btnClearSel = document.getElementById("btn-clear-selection");
  if (btnClearSel) {
    btnClearSel.addEventListener("click", () => {
      console.info("[SEL] clear via button/esc");
      clearSelection("button");
    });
    console.info("[SEL] clear button wired");
  }
}
