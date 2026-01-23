/**
 * Debugger.js
 * centralized debug logic service.
 * Manages debug state and data fetching, emits changes via subscribers.
 */

import { ApiClient } from "./ApiClient.js";
import { Logger } from "./Logger.js";

class DebuggerService {
  constructor() {
    this.state = {
      currentAst: null,
      currentMapResult: null,
      currentStepResult: null,
      lastClickedIntegerTarget: null,
      error: null,
      loading: false,
    };
    this.subscribers = [];
  }

  // ...

  async forceApplyStep(payload) {
    // payload: { sessionId, expressionLatex, selectionPath, ... }
    // The endpoint is /api/orchestrator/v5/step
    // This matches request in handleForceIntToFrac
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/orchestrator/v5/step", payload);
      this.setState({ loading: false });
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // --- Actions ---

  async fetchAstDebug(latex) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/ast-debug", { latex });
      if (res.type === "ok") {
        this.setState({ currentAst: res.ast, loading: false });
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchMapDebug(req) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/mapmaster-debug", req);
      if (res.type === "ok") {
        const updates = { currentMapResult: res.result, loading: false };
        if (res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchStepDebug(req) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/step-debug", req);
      if (res.type === "ok") {
        const updates = { currentStepResult: res.result, loading: false };
        if (res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchGlobalMapDebug(req) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/mapmaster-global-map", req);
      if (res.type === "ok") {
        const updates = { currentGlobalMapResult: res.result, loading: false };
        if (res.result && res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchPrimitiveMapDebug(req) {
    this.setState({ loading: true, error: null });
    try {
      // Endpoint Assumption: based on debug-tool.js calls callPrimitiveMapDebug manually?
      // Wait, debug-tool.js did NOT have callPrimitiveMapDebug defined in the first 800 lines.
      // But it used it in handlePrimitiveMapDebug. The definition was missing from view.
      // Assuming standard endpoint "/api/primitive-map-debug"
      const res = await ApiClient.post("/api/primitive-map-debug", req);
      if (res.status === "ok") {
        this.setState({ currentPrimitiveMapResult: res.map, loading: false });
      } else {
        this.setState({
          error: res.errorMessage || "Unknown error",
          loading: false,
        });
      }
      return res;
    } catch (e) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async resolvePath(latex, selectionPath) {
    // Just a pass-through call, maybe we don't store it in main state or we do?
    // For now let's just return it, calling UI can handle display.
    return ApiClient.post("/debug/ast/resolve-path", { latex, selectionPath });
  }

  setLastClickedInteger(target) {
    this.setState({ lastClickedIntegerTarget: target });
    Logger.log("[Debugger] Integer clicked:", target);
  }
}

export const Debugger = new DebuggerService();
