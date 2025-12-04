import {
  EngineRequest,
  EngineResponse,
} from "./types";
import { callEntryStep, callHint, callUndo } from "./backendClient";
import { getConfig } from "./config";

function computeSelectionPath(ev: EngineRequest["clientEvent"]): string | null {
  // Stage 5 baseline: we either use surfaceNodeId if present or no selection.
  if (ev.surfaceNodeId && typeof ev.surfaceNodeId === "string") {
    return ev.surfaceNodeId;
  }
  return null;
}

function deriveSessionId(req: EngineRequest): string {
  if (req.sessionId && typeof req.sessionId === "string" && req.sessionId.trim().length > 0) {
    return req.sessionId;
  }
  return "viewer-session";
}

export async function handleEngineRequest(request: EngineRequest): Promise<EngineResponse> {
  if (!request || typeof request !== "object") {
    return {
      type: "error",
      requestType: "parse",
      message: "Invalid EngineRequest payload.",
      error: {
        code: "invalid-engine-request",
        details: "Request is not an object",
      },
    };
  }

  if (!request.clientEvent || typeof request.clientEvent.latex !== "string") {
    return {
      type: "error",
      requestType: request.type ?? "parse",
      message: "EngineRequest.clientEvent.latex is required.",
      error: {
        code: "invalid-engine-request",
        details: "Missing clientEvent.latex",
      },
    };
  }

  switch (request.type) {
    case "applyStep":
      return handleApplyStep(request);
    case "getHints":
      return handleGetHints(request);
    case "undoLastStep":
      return handleUndoLastStep(request);
    case "parse":
      return handleParse(request);
    case "previewStep":
      return handlePreviewStep(request);
    default:
      return {
        type: "error",
        requestType: request.type ?? "parse",
        message: `Unknown EngineRequest.type: ${String(request.type)}`,
        error: {
          code: "unknown-request-type",
          details: request.type,
        },
      };
  }
}

async function handleApplyStep(request: EngineRequest): Promise<EngineResponse> {
  const cfg = getConfig();
  const selectionPath = computeSelectionPath(request.clientEvent);
  const sessionId = deriveSessionId(request);

  const backendBody = {
    sessionId,
    courseId: "default",
    expressionLatex: request.clientEvent.latex,
    selectionPath,
    operatorIndex: request.clientEvent.surfaceOperatorIndex,
    policyId: "viewer.student",
    token: cfg.demoJwt,
  };

  try {
    const { statusCode, json } = await callEntryStep(backendBody);

    if (statusCode >= 500) {
      return {
        type: "error",
        requestType: "applyStep",
        message: "Backend /api/entry-step call failed with server error.",
        error: {
          code: "backend-transport-error",
          details: { httpStatus: statusCode, response: json },
        },
        result: { latex: request.clientEvent.latex },
      };
    }

    const status = json?.status;

    if (status === "step-applied") {
      return {
        type: "ok",
        requestType: "applyStep",
        result: {
          latex: json.expressionLatex,
          meta: {
            source: "backend-entry-step",
            status: "step-applied",
          },
          appliedRuleId: json.appliedRuleId,
        },
      };
    }

    if (status === "no-candidates") {
      return {
        type: "ok",
        requestType: "applyStep",
        message: "No candidates available for this expression.",
        result: {
          latex: json.expressionLatex,
          meta: {
            source: "backend-entry-step",
            status: "no-candidates",
          },
        },
      };
    }

    if (status === "engine-error") {
      return {
        type: "error",
        requestType: "applyStep",
        error: {
          code: "engine-error",
          details: { backendStatus: "engine-error" },
        },
        result: {
          latex: json.expressionLatex ?? "",
        },
      };
    }

    return {
      type: "error",
      requestType: "applyStep",
      message: "Unexpected backend status for /api/entry-step.",
      error: {
        code: "unexpected-backend-status",
        details: { status, json },
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  } catch (err) {
    return {
      type: "error",
      requestType: "applyStep",
      message: "Backend /api/entry-step call failed.",
      error: {
        code: "backend-transport-error",
        details: String(err),
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  }
}

async function handleGetHints(request: EngineRequest): Promise<EngineResponse> {
  const selectionPath = computeSelectionPath(request.clientEvent);
  const sessionId = deriveSessionId(request);

  const backendBody = {
    sessionId,
    courseId: "default",
    expressionLatex: request.clientEvent.latex,
    selectionPath,
  };

  try {
    const { statusCode, json } = await callHint(backendBody);

    if (statusCode >= 500) {
      return {
        type: "error",
        requestType: "getHints",
        message: "Backend /api/hint-request call failed with server error.",
        error: {
          code: "backend-transport-error",
          details: { httpStatus: statusCode, response: json },
        },
        result: { latex: request.clientEvent.latex },
      };
    }

    const status = json?.status;

    if (status === "hint-found") {
      return {
        type: "ok",
        requestType: "getHints",
        result: {
          latex: request.clientEvent.latex,
          meta: {
            source: "backend-hint",
            status: "hint-found",
            hintText: json.hintText ?? "",
          },
        },
      };
    }

    if (status === "no-hint") {
      return {
        type: "ok",
        requestType: "getHints",
        message: "No hint available.",
        result: {
          latex: request.clientEvent.latex,
          meta: {
            source: "backend-hint",
            status: "no-hint",
          },
        },
      };
    }

    if (status === "error") {
      return {
        type: "error",
        requestType: "getHints",
        error: {
          code: "hint-error",
          details: {
            backendStatus: "error",
            backendError: json.error,
          },
        },
        result: {
          latex: request.clientEvent.latex,
        },
      };
    }

    return {
      type: "error",
      requestType: "getHints",
      message: "Unexpected backend status for /api/hint-request.",
      error: {
        code: "unexpected-backend-status",
        details: { status, json },
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  } catch (err) {
    return {
      type: "error",
      requestType: "getHints",
      message: "Backend /api/hint-request call failed.",
      error: {
        code: "backend-transport-error",
        details: String(err),
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  }
}

async function handleUndoLastStep(request: EngineRequest): Promise<EngineResponse> {
  const sessionId = deriveSessionId(request);

  const backendBody = { sessionId };

  try {
    const { statusCode, json } = await callUndo(backendBody);

    if (statusCode >= 500) {
      return {
        type: "error",
        requestType: "undoLastStep",
        message: "Backend /api/undo-step call failed with server error.",
        error: {
          code: "backend-transport-error",
          details: { httpStatus: statusCode, response: json },
        },
        result: { latex: request.clientEvent.latex },
      };
    }

    const status = json?.status;

    if (status === "undo-complete") {
      return {
        type: "ok",
        requestType: "undoLastStep",
        result: {
          latex: json.expressionLatex,
          meta: {
            source: "backend-undo",
            status: "undo-complete",
          },
        },
      };
    }

    if (status === "no-history") {
      return {
        type: "ok",
        requestType: "undoLastStep",
        message: "No history to undo.",
        result: {
          latex: json.expressionLatex,
          meta: {
            source: "backend-undo",
            status: "no-history",
          },
        },
      };
    }

    if (status === "error") {
      return {
        type: "error",
        requestType: "undoLastStep",
        error: {
          code: "undo-error",
          details: {
            backendStatus: "error",
          },
        },
        result: {
          latex: json.expressionLatex ?? "",
        },
      };
    }

    return {
      type: "error",
      requestType: "undoLastStep",
      message: "Unexpected backend status for /api/undo-step.",
      error: {
        code: "unexpected-backend-status",
        details: { status, json },
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  } catch (err) {
    return {
      type: "error",
      requestType: "undoLastStep",
      message: "Backend /api/undo-step call failed.",
      error: {
        code: "backend-transport-error",
        details: String(err),
      },
      result: {
        latex: request.clientEvent.latex,
      },
    };
  }
}

function handleParse(request: EngineRequest): EngineResponse {
  return {
    type: "ok",
    requestType: "parse",
    result: {
      latex: request.clientEvent.latex,
      meta: {
        source: "adapter-local",
        status: "parsed",
        note: "No backend call; parse is a local echo in Stage 5.",
      },
    },
  };
}

function handlePreviewStep(request: EngineRequest): EngineResponse {
  return {
    type: "ok",
    requestType: "previewStep",
    message: "Preview not implemented in Stage 5 baseline.",
    result: {
      latex: request.clientEvent.latex,
      meta: {
        source: "adapter-local",
        status: "preview-not-implemented",
      },
    },
  };
}