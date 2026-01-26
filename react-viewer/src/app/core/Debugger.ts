// core/Debugger.ts
// centralized debug logic service.

import { ApiClient } from "./ApiClient";
import { Logger } from "./Logger";

export interface DebuggerState {
  currentAst: any;
  currentMapResult: any;
  currentStepResult: any;
  lastClickedIntegerTarget: any;
  currentGlobalMapResult?: any;
  currentPrimitiveMapResult?: any;
  error: string | null;
  loading: boolean;
}

export type DebuggerSubscriber = (state: DebuggerState) => void;

class DebuggerService {
  private state: DebuggerState;
  private subscribers: DebuggerSubscriber[] = [];

  constructor() {
    this.state = {
      currentAst: null,
      currentMapResult: null,
      currentStepResult: null,
      lastClickedIntegerTarget: null,
      error: null,
      loading: false,
    };
  }

  async forceApplyStep(payload: any) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/orchestrator/v5/step", payload);
      this.setState({ loading: false });
      return res;
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  subscribe(callback: DebuggerSubscriber) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  setState(updates: Partial<DebuggerState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // --- Actions ---

  async fetchAstDebug(latex: string) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/ast-debug", { latex });
      if (res.type === "ok") {
        this.setState({ currentAst: res.ast, loading: false });
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchMapDebug(req: any) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/mapmaster-debug", req);
      if (res.type === "ok") {
        const updates: Partial<DebuggerState> = {
          currentMapResult: res.result,
          loading: false,
        };
        if (res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchStepDebug(req: any) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/step-debug", req);
      if (res.type === "ok") {
        const updates: Partial<DebuggerState> = {
          currentStepResult: res.result,
          loading: false,
        };
        if (res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchGlobalMapDebug(req: any) {
    this.setState({ loading: true, error: null });
    try {
      const res = await ApiClient.post("/api/mapmaster-global-map", req);
      if (res.type === "ok") {
        const updates: Partial<DebuggerState> = {
          currentGlobalMapResult: res.result,
          loading: false,
        };
        if (res.result && res.result.astSnapshot) {
          updates.currentAst = res.result.astSnapshot;
        }
        this.setState(updates);
      } else {
        this.setState({ error: res.message, loading: false });
      }
      return res;
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async fetchPrimitiveMapDebug(req: any) {
    this.setState({ loading: true, error: null });
    try {
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
    } catch (e: any) {
      this.setState({ error: e.message, loading: false });
      throw e;
    }
  }

  async resolvePath(latex: string, selectionPath: string) {
    return ApiClient.post("/debug/ast/resolve-path", { latex, selectionPath });
  }

  setLastClickedInteger(target: any) {
    this.setState({ lastClickedIntegerTarget: target });
    Logger.log("[Debugger] Integer clicked:", target);
  }
}

export const Debugger = new DebuggerService();
