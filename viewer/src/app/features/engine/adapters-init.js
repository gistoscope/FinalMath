// features/engine/adapters-init.js
// Adapter initialization (FileBus, DisplayAdapter, EngineAdapter)

import { V5_ENDPOINT_URL, getEngineBaseUrl } from "../../core/api.js";
import { FileBus } from "../../core/FileBus.js";
import {
  getCurrentLatex,
  integerCycleState,
  selectionState,
} from "../../core/state.js";
import { hitTestPoint } from "../../surface-map/surface-map.js";
import { ClientEventRecorder, DisplayAdapter } from "./DisplayAdapter.js";
import { EngineAdapter } from "./EngineAdapter.js";

// C4: FileBus (in-browser demo)
export const fileBus = new FileBus({ name: "browser-demo-bus" });

// C2: DisplayAdapter + in-browser recorder
export const eventRecorder = new ClientEventRecorder();

export const displayAdapter = new DisplayAdapter(
  () => getCurrentLatex(),
  () => selectionState,
  (evt) => {
    // 1) Publish into FileBus (for future EngineAdapter / Recorder)
    fileBus.publishClientEvent(evt);
    // 2) Mirror into local recorder for JSONL export
    eventRecorder.handleEvent(evt);
  },
);

// C6: EngineAdapter + StubEngine (embedded demo)
export const engineAdapter = new EngineAdapter(fileBus, {
  mode: "http",
  httpEndpoint: "http://localhost:4201/api/entry-step",
  httpTimeout: 8000,
});

/**
 * Initialize all adapters and expose globals
 */
export function initializeAdapters() {
  engineAdapter.start();

  // Expose globals
  if (typeof window !== "undefined") {
    window.__surfaceMapUtils = { hitTestPoint };
    window.getEngineBaseUrl = getEngineBaseUrl;
    window.__p1IntegerCycleState = integerCycleState;
    window.__motorFileBus = fileBus;
    window.__motorEngineAdapter = engineAdapter;
    window.__v5EndpointUrl = V5_ENDPOINT_URL;
  }
}
