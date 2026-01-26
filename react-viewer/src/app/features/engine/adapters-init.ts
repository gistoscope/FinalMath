// features/engine/adapters-init.ts
// Adapter initialization (FileBus, DisplayAdapter, EngineAdapter)

import { FileBus } from "../../core/FileBus";
import { getCurrentLatex, selectionState } from "../../core/state";
import { ClientEventRecorder, DisplayAdapter } from "./DisplayAdapter";
import { EngineAdapter } from "./EngineAdapter";

// C4: FileBus (in-browser demo)
export const fileBus = new FileBus({ name: "browser-demo-bus" });

// C2: DisplayAdapter + in-browser recorder
export const eventRecorder = new ClientEventRecorder();

export const displayAdapter = new DisplayAdapter(
  () => getCurrentLatex(),
  () => selectionState as any,
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
 * Initialize all adapters
 */
export function initializeAdapters() {
  engineAdapter.start();
}
