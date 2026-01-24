import type { ViewerAction } from "../../types/viewer-state";

type Listener = (action: ViewerAction) => void;

class UIBridge {
  private listeners: Listener[] = [];

  /**
   * Called by React (ViewerProvider) to subscribe to legacy logic updates.
   */
  subscribe(callback: Listener) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Internal notify method to dispatch actions to all subscribers.
   */
  private notify(action: ViewerAction) {
    this.listeners.forEach((listener) => listener(action));
  }

  // Legacy logic calling methods

  updateHover(data: { target?: string | null; lastClick?: string | null }) {
    this.notify({ type: "UPDATE_HOVER", payload: data });
  }

  updateStepHint(hint: string | null) {
    this.notify({ type: "UPDATE_STEP_HINT", payload: hint });
  }

  updateEngineStatus(data: {
    clientEvent?: string;
    request?: string;
    response?: string;
  }) {
    this.notify({ type: "UPDATE_ENGINE", payload: data });
  }

  updateTSA(data: Partial<ViewerAction & { type: "UPDATE_TSA" }>["payload"]) {
    this.notify({ type: "UPDATE_TSA", payload: data as any });
  }

  appendLog(message: string) {
    this.notify({ type: "ADD_LOG", payload: message });
  }

  setSurfaceMap(data: object | null) {
    this.notify({ type: "SET_SURFACE_MAP", payload: data });
  }

  clearLogs() {
    this.notify({ type: "CLEAR_LOGS" });
  }
}

export const uiBridge = new UIBridge();
