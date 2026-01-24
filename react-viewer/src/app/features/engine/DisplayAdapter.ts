// features/engine/DisplayAdapter.ts
// Browser-only DisplayAdapter + simple JSONL recorder for ClientEvent.

export interface SelectionState {
  mode: string;
  primaryId: string | null;
  selectedIds: Set<string> | string[];
}

export interface ClientEvent {
  type: "hover" | "click" | "selectionChanged";
  timestamp: number;
  latex: string;
  surfaceNodeId?: string;
  surfaceNodeKind?: string;
  surfaceNodeRole?: string;
  surfaceNodeText?: string;
  surfaceOperatorIndex?: number;
  astNodeId?: string;
  astOperatorIndex?: number;
  pointer?: {
    clientX: number;
    clientY: number;
  };
  click?: {
    button: "left" | "right";
    clickCount: number;
    modifiers: {
      shift: boolean;
      alt: boolean;
      ctrl: boolean;
      meta: boolean;
    };
  };
  selection?: string[];
  selectionMode?: string;
  selectionPrimaryId?: string | null;
  selectionSource?: "rect" | "click";
}

import { SurfaceNode } from "../../surface-map/surface-node";

/**
 * DisplayAdapter normalizes UI events (hover/click/selection) into
 * a flat ClientEvent object.
 */
export class DisplayAdapter {
  private _getLatex: () => string;
  private _getSelectionState: () => SelectionState | null;
  private _onClientEvent: (evt: ClientEvent) => void;

  constructor(
    getLatex: () => string,
    getSelectionState: () => SelectionState | null,
    onClientEvent: (evt: ClientEvent) => void,
  ) {
    this._getLatex = typeof getLatex === "function" ? getLatex : () => "";
    this._getSelectionState =
      typeof getSelectionState === "function" ? getSelectionState : () => null;
    this._onClientEvent =
      typeof onClientEvent === "function" ? onClientEvent : () => {};
  }

  emitHover(node: SurfaceNode | null, e: PointerEvent) {
    const evt = this._baseEvent("hover", node, e);
    this._emit(evt);
  }

  emitClick(node: SurfaceNode | null, e: PointerEvent) {
    console.log("[VIEWER-CLICK] Raw Click Target:", {
      nodeId: node ? node.id : "null",
      kind: node ? node.kind : "null",
      role: node ? node.role : "null",
      latexFragment: node ? node.latexFragment : "null",
      operatorIndex:
        node && typeof node.operatorIndex === "number"
          ? node.operatorIndex
          : "undefined",
      astNodeId: node ? node.astNodeId : "undefined",
      latex: this._getLatex(),
    });

    const evt = this._baseEvent("click", node, e);
    evt.click = {
      button: e.button === 2 ? "right" : "left",
      clickCount: e.detail >= 2 ? 2 : 1,
      modifiers: {
        shift: !!e.shiftKey,
        alt: !!e.altKey,
        ctrl: !!e.ctrlKey,
        meta: !!e.metaKey,
      },
    };
    this._attachSelection(evt);
    this._emit(evt);
  }

  emitSelectionChanged(source: "rect" | "click", e: PointerEvent) {
    const evt = this._baseEvent("selectionChanged", null, e);
    this._attachSelection(evt);
    evt.selectionSource = source;
    this._emit(evt);
  }

  private _baseEvent(
    type: "hover" | "click" | "selectionChanged",
    node: SurfaceNode | null,
    e: PointerEvent | null,
  ): ClientEvent {
    const latex = this._getLatex();
    const operatorIndex =
      node &&
      typeof node.operatorIndex === "number" &&
      Number.isFinite(node.operatorIndex)
        ? node.operatorIndex
        : undefined;
    const astNodeId =
      node && node.astNodeId ? String(node.astNodeId) : undefined;
    const astOperatorIndex =
      node &&
      typeof (node as unknown as Record<string, unknown>).astOperatorIndex ===
        "number" &&
      Number.isFinite(
        (node as unknown as Record<string, unknown>).astOperatorIndex,
      )
        ? ((node as unknown as Record<string, unknown>)
            .astOperatorIndex as number)
        : undefined;

    return {
      type,
      timestamp: Date.now(),
      latex: typeof latex === "string" ? latex : "",
      surfaceNodeId: node && node.id ? String(node.id) : undefined,
      surfaceNodeKind: node && node.kind ? String(node.kind) : undefined,
      surfaceNodeRole: node && node.role ? String(node.role) : undefined,
      surfaceNodeText:
        node && node.latexFragment ? String(node.latexFragment) : undefined,
      surfaceOperatorIndex: operatorIndex,
      astNodeId: astNodeId,
      astOperatorIndex: astOperatorIndex,
      pointer: e
        ? {
            clientX: e.clientX,
            clientY: e.clientY,
          }
        : undefined,
    };
  }

  private _attachSelection(evt: ClientEvent) {
    const sel = this._getSelectionState && this._getSelectionState();
    if (!sel) return;
    const ids =
      sel.selectedIds instanceof Set
        ? Array.from(sel.selectedIds)
        : sel.selectedIds || [];
    evt.selection = ids.map(String);
    evt.selectionMode = sel.mode || "none";
    evt.selectionPrimaryId =
      sel.primaryId !== undefined && sel.primaryId !== null
        ? String(sel.primaryId)
        : null;
  }

  private _emit(evt: ClientEvent) {
    try {
      this._onClientEvent(evt);
    } catch (err) {
      console.error("[DisplayAdapter] onClientEvent error", err);
    }
  }
}

/**
 * Simple in-browser recorder that collects ClientEvent objects.
 */
export class ClientEventRecorder {
  public events: ClientEvent[] = [];

  handleEvent(evt: ClientEvent) {
    this.events.push(evt);
    console.log("[ClientEvent]", evt);
  }

  clear() {
    this.events = [];
  }

  download(filename = "client-events.jsonl") {
    if (!this.events.length) {
      console.warn("[ClientEventRecorder] No events to download");
    }
    const lines = this.events.map((e) => JSON.stringify(e));
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
