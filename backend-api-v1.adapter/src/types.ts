export type EngineRequestType =
  | "parse"
  | "applyStep"
  | "previewStep"
  | "getHints"
  | "undoLastStep";

export type ClientEventType =
  | "init"
  | "hover"
  | "click"
  | "dblclick"
  | "selectionChanged"
  | "dragSelect"
  | "keyboardShortcut";

export interface ClientSelection {
  anchorId: string;
  focusId: string;
}

export interface ClientEvent {
  type: ClientEventType;
  timestamp: number;
  latex: string;
  surfaceNodeId?: string;
  surfaceOperatorIndex?: number;
  selection?: ClientSelection | null;
  meta?: Record<string, unknown>;
}

export interface EngineRequest {
  type: EngineRequestType;
  sessionId?: string;
  clientEvent: ClientEvent;
}

export type EngineResponseStatus = "ok" | "error";

export interface EngineResult {
  latex: string;
  highlights?: string[];
  meta?: Record<string, unknown>;
  appliedRuleId?: string;
}

export interface EngineErrorPayload {
  code: string;
  details?: unknown;
}

export interface EngineResponse {
  type: EngineResponseStatus;
  requestType: EngineRequestType;
  message?: string;
  result?: EngineResult;
  error?: EngineErrorPayload;
}

// Backend API types (partial, only what adapter actually uses)

export type BackendEntryStepStatus =
  | "step-applied"
  | "no-candidates"
  | "engine-error";

export interface BackendEntryStepResponse {
  status: BackendEntryStepStatus;
  expressionLatex: string;
  debugInfo?: unknown | null;
  appliedRuleId?: string;
}

export type BackendHintStatus = "hint-found" | "no-hint" | "error";

export interface BackendHintResponse {
  status: BackendHintStatus;
  hintText?: string;
  error?: string;
}

export type BackendUndoStatus = "undo-complete" | "no-history" | "error";

export interface BackendUndoResponse {
  status: BackendUndoStatus;
  expressionLatex: string;
}