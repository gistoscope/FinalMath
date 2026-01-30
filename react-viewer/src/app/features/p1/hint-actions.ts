// features/p1/hint-actions.ts
// P1 hint actions and apply functions

import { runV5Step } from "../../client/orchestratorV5Client";
import { getV5EndpointUrl } from "../../core/api";
import { detectStep2MultiplierContext } from "../../core/stable-id";
import {
  getCurrentLatex,
  hintApplyState,
  integerCycleState,
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
  MODE_ORANGE,
  setCurrentLatex,
} from "../../core/state";
import { updateP1Diagnostics } from "../../ui/diagnostics-panel";

/**
 * SINGLE GATEWAY for all apply actions (hint click, double-click)
 */
export async function applyCurrentHintForStableKey(
  logPrefix = "[HINT-APPLY]",
  onSuccess: ((newLatex: string) => void) | null = null,
) {
  const currentMode = integerCycleState.mode;
  const currentStableKey = integerCycleState.stableKey;
  const currentAstId = integerCycleState.astNodeId;
  const currentLatex = getCurrentLatex();

  if (currentMode === MODE_GREEN) {
    const isStep2 = !!integerCycleState.isStep2Context;
    const isDoubleClickApply =
      typeof logPrefix === "string" && logPrefix.indexOf("DOUBLE-CLICK") >= 0;

    if (isDoubleClickApply && !isStep2) {
      console.log(
        `[GREEN-DBLCLICK] Treat GREEN as ORANGE for P1: stableKey=${currentStableKey} -> primitive=P.INT_TO_FRAC`,
      );
    } else {
      console.log(
        `[APPLY BLOCKED] stableKey=${currentStableKey} mode=0 (GREEN) - selection only`,
      );
      return { applied: false, reason: "mode-0" };
    }
  }

  if (hintApplyState.applying) {
    console.log(`${logPrefix} Ignored: already applying`);
    return { applied: false, reason: "re-entry" };
  }

  const modeConfig = MODE_CONFIG[currentMode];
  let primitiveId = modeConfig?.primitiveId;

  if (currentMode === MODE_GREEN) {
    const isStep2 = !!integerCycleState.isStep2Context;
    const isDoubleClickApply =
      typeof logPrefix === "string" && logPrefix.indexOf("DOUBLE-CLICK") >= 0;
    if (isDoubleClickApply && !isStep2) {
      primitiveId = "P.INT_TO_FRAC";
    }
  }

  if (currentMode === MODE_ORANGE && integerCycleState.isStep2Context) {
    console.log(
      `[APPLY BLOCKED] stableKey=${currentStableKey} mode=1 (ORANGE) - multiplier-1 cannot use INT_TO_FRAC (would kill Step2)`,
    );
    return { applied: false, reason: "multiplier-1-protected" };
  }

  if (currentMode === MODE_BLUE && integerCycleState.step2Info) {
    primitiveId = "P.ONE_TO_TARGET_DENOM";
  }

  if (!primitiveId) {
    console.warn(
      `${logPrefix} BLOCKED: No primitiveId for mode=${currentMode}`,
    );
    return { applied: false, reason: "no-primitive" };
  }

  const targetDenom =
    currentMode === MODE_BLUE && integerCycleState.step2Info
      ? integerCycleState.step2Info.oppositeDenom
      : null;
  console.log(
    `${logPrefix} stableKey=${currentStableKey} astId=${currentAstId} mode=${currentMode} primitive=${primitiveId}${targetDenom ? ` targetDenom=${targetDenom}` : ""}`,
  );

  hintApplyState.applying = true;

  try {
    const endpointUrl = getV5EndpointUrl();

    const v5Payload = {
      sessionId: "default-session",
      expressionLatex: typeof currentLatex === "string" ? currentLatex : "",
      selectionPath: currentAstId || "root",
      preferredPrimitiveId: primitiveId,
      courseId: "default",
      userRole: "student",
      surfaceNodeKind: "Num",
    };

    console.log(
      `[VIEWER-REQUEST] preferredPrimitiveId=${primitiveId} selectionPath=${currentAstId || "root"}`,
    );

    const result = await runV5Step(endpointUrl, v5Payload, 8000);

    console.log(`[APPLY RESULT] status=${result.status}`);

    if (
      result.status === "step-applied" &&
      result.engineResult?.newExpressionLatex
    ) {
      const newLatex = result.engineResult.newExpressionLatex;
      console.log(`[APPLY RESULT] SUCCESS! newLatex=${newLatex}`);
      setCurrentLatex(newLatex);
      if (onSuccess) {
        onSuccess(newLatex);
      }
      return { applied: true, newLatex };
    } else {
      console.warn(`[APPLY RESULT] FAILED status=${result.status}`);
      return { applied: false, reason: result.status };
    }
  } catch (err) {
    console.error(`${logPrefix} Exception:`, err);
    return { applied: false, reason: "exception", error: err };
  } finally {
    hintApplyState.applying = false;
  }
}

/**
 * P1: Ensure we have a valid AST nodeId + up-to-date choice list for the currently selected integer.
 */
export async function ensureP1IntegerContext(
  surfaceNodeId: string,
  fallbackAstNodeId: string | null = null,
) {
  const currentLatex = getCurrentLatex();
  let astNodeId = fallbackAstNodeId || integerCycleState.astNodeId || null;

  if (!astNodeId && typeof window !== "undefined") {
    const map = (window as any).__currentSurfaceMap;
    if (map && Array.isArray(map.atoms)) {
      const node = map.atoms.find((a: any) => a && a.id === surfaceNodeId);
      if (node && node.astNodeId) astNodeId = node.astNodeId;
    }
  }

  const endpointUrl = getV5EndpointUrl();

  const choicePayload = {
    sessionId: "default-session",
    expressionLatex: currentLatex,
    selectionPath: astNodeId,
    userRole: "student",
    userId: "student",
    courseId: "default",
    surfaceNodeKind: "Num",
  };

  updateP1Diagnostics(
    {
      selectedSurfaceNodeId: surfaceNodeId || "N/A",
      resolvedAstNodeId: astNodeId || "MISSING",
      lastChoiceStatus: "RUNNING",
      lastChoiceTargetPath: astNodeId || "N/A",
      lastChoiceCount: String(integerCycleState.primitives?.length || 0),
    },
    currentLatex,
  );

  const result = await runV5Step(endpointUrl, choicePayload, 8000);

  if (
    result &&
    (String(result.status || "") === "choice" ||
      String(result.status || "").includes("choice")) &&
    Array.isArray(result.choices) &&
    result.choices.length > 0
  ) {
    const choices = result.choices;
    const targetNodeId = choices[0].targetNodeId || astNodeId || null;
    astNodeId = targetNodeId;

    integerCycleState.primitives = choices.map((c, idx) => ({
      id: c.primitiveId,
      label: c.label,
      color: idx === 0 ? "#4CAF50" : "#FF9800",
      targetNodeId: c.targetNodeId || targetNodeId,
    }));

    const step2Context = detectStep2MultiplierContext(
      surfaceNodeId,
      astNodeId,
      (window as any).__currentSurfaceMap,
      currentLatex,
    );
    if (step2Context.isStep2Context) {
      integerCycleState.primitives.push({
        id: "P.ONE_TO_TARGET_DENOM",
        label: `Convert 1 → ${step2Context.oppositeDenom}/${step2Context.oppositeDenom}`,
        color: "#2196F3",
        targetNodeId: step2Context.path,
        isStep2: true,
        oppositeDenom: step2Context.oppositeDenom,
        side: step2Context.side,
      } as any);

      const hints = integerCycleState.primitives.map((p) => p.id);
      console.log(
        `[INT-CYCLE] surfaceId=${surfaceNodeId} isMultiplier1=true selectionPath=${step2Context.path} side=${step2Context.side} cycleIndex(before)=${integerCycleState.cycleIndex} cycleIndex(after)=${integerCycleState.cycleIndex} hints=[${hints.join(",")}]`,
      );
    }

    updateP1Diagnostics(
      {
        resolvedAstNodeId: astNodeId || "MISSING",
        primitiveId:
          integerCycleState.primitives[integerCycleState.cycleIndex]?.id ||
          "N/A",
        lastChoiceStatus: "choice",
        lastChoiceTargetPath: astNodeId || "N/A",
        lastChoiceCount: String(integerCycleState.primitives.length),
        lastHintApplyError: "N/A",
      },
      currentLatex,
    );

    integerCycleState.astNodeId = astNodeId;
    return { astNodeId, primitives: integerCycleState.primitives };
  }

  const errMsg =
    result && result.rawResponse && result.rawResponse.error
      ? String(result.rawResponse.error)
      : "No choice response";
  updateP1Diagnostics(
    {
      resolvedAstNodeId: astNodeId || "MISSING",
      lastChoiceStatus: result ? result.status : "engine-error",
      lastChoiceTargetPath: astNodeId || "N/A",
      lastChoiceCount: String(integerCycleState.primitives?.length || 0),
      lastHintApplyError: errMsg,
    },
    currentLatex,
  );

  integerCycleState.astNodeId = astNodeId;
  return { astNodeId, primitives: integerCycleState.primitives };
}

/**
 * P1: Apply action for the current mode (GREEN or ORANGE)
 */
export async function applyP1Action(
  surfaceNodeId: string,
  astNodeId: string | null,
  cycleIndex: number,
  onSuccess: ((newLatex: string) => void) | null = null,
) {
  const currentLatex = getCurrentLatex();

  if (!astNodeId) {
    try {
      const ctx = await ensureP1IntegerContext(surfaceNodeId, null);
      astNodeId = ctx.astNodeId;
    } catch (err) {
      console.warn(
        "[P1-HINT-APPLY] Failed to resolve astNodeId via ensureP1IntegerContext:",
        err,
      );
    }
  }

  const primitive = integerCycleState.primitives[cycleIndex];
  if (!primitive) {
    console.warn("[P1-APPLY] No primitive for cycleIndex", cycleIndex);
    return;
  }

  let targetPath = astNodeId || integerCycleState.astNodeId;

  if (!targetPath && surfaceNodeId && typeof window !== "undefined") {
    const map = (window as any).__currentSurfaceMap;
    if (map) {
      const surfaceNode = map.atoms?.find((n: any) => n.id === surfaceNodeId);
      if (surfaceNode && surfaceNode.astNodeId) {
        targetPath = surfaceNode.astNodeId;
      }
    }
  }

  if (!targetPath) {
    const latex = typeof currentLatex === "string" ? currentLatex.trim() : "";
    const isIsolatedInteger = /^-?\d+$/.test(latex);

    if (isIsolatedInteger) {
      targetPath = "root";
    } else {
      console.error(
        `[P1-APPLY] ERROR: No valid astNodeId for non-isolated integer expression!`,
      );
      return;
    }
  }

  const endpointUrl = getV5EndpointUrl();

  const v5Payload = {
    sessionId: "default-session",
    expressionLatex: typeof currentLatex === "string" ? currentLatex : "",
    selectionPath: targetPath,
    preferredPrimitiveId: primitive.id,
    courseId: "default",
    userRole: "student",
    surfaceNodeKind: "Num",
  };

  updateP1Diagnostics(
    {
      selectedSurfaceNodeId: surfaceNodeId || "N/A",
      resolvedAstNodeId: astNodeId || "MISSING",
      primitiveId: primitive.id,
      lastHintApplyStatus: "RUNNING",
      lastHintApplySelectionPath: targetPath || "MISSING",
      lastHintApplyPreferredPrimitiveId: primitive.id,
      lastHintApplyEndpoint: endpointUrl || "N/A",
      lastHintApplyNewLatex: "N/A",
      lastHintApplyError: "N/A",
    },
    currentLatex,
  );

  if (typeof window !== "undefined" && (window as any).__traceHub) {
    (window as any).__traceHub.emit({
      module: "viewer.main",
      event: "VIEWER_HINT_APPLY_REQUEST",
      data: {
        latex: v5Payload.expressionLatex,
        selectionPath: targetPath,
        preferredPrimitiveId: primitive.id,
        surfaceNodeId,
      },
    });
  }

  try {
    const result = await runV5Step(endpointUrl, v5Payload, 8000);
    const _newLatex =
      result &&
      result.engineResult &&
      typeof result.engineResult.latex === "string"
        ? result.engineResult.latex
        : "N/A";
    updateP1Diagnostics(
      {
        lastHintApplyStatus: result ? result.status : "engine-error",
        lastHintApplyNewLatex: _newLatex,
        lastHintApplyError:
          result &&
          result.status === "engine-error" &&
          result.rawResponse &&
          result.rawResponse.error
            ? String(result.rawResponse.error)
            : "N/A",
      },
      currentLatex,
    );

    if (typeof window !== "undefined" && (window as any).__traceHub) {
      (window as any).__traceHub.emit({
        module: "viewer.main",
        event: "VIEWER_HINT_APPLY_RESPONSE",
        data: {
          status: result ? result.status : "engine-error",
          newLatex: result?.engineResult?.newExpressionLatex || null,
          error:
            result && result.status === "engine-error"
              ? result.rawResponse?.error || "unknown"
              : null,
        },
      });
    }

    if (
      result.status === "step-applied" &&
      result.engineResult?.newExpressionLatex
    ) {
      const newLatex = result.engineResult.newExpressionLatex;
      setCurrentLatex(newLatex);
      if (onSuccess) {
        onSuccess(newLatex);
      }
    }
  } catch (err) {
    console.error(`[P1-HINT-APPLY][ERROR] Exception calling backend:`, err);
  }
}

/**
 * P1: Apply action with explicit primitiveId
 */
export async function applyP1ActionWithPrimitive(
  _surfaceNodeId: string,
  astNodeId: string | null,
  primitiveId: string,
  onSuccess: ((newLatex: string) => void) | null = null,
) {
  if (!primitiveId) {
    console.warn("[P1-HINT-APPLY] No primitiveId provided");
    return;
  }

  const currentLatex = getCurrentLatex();
  const endpointUrl = getV5EndpointUrl();

  const v5Payload = {
    sessionId: "default-session",
    expressionLatex: typeof currentLatex === "string" ? currentLatex : "",
    selectionPath: astNodeId || "root",
    preferredPrimitiveId: primitiveId,
    courseId: "default",
    userRole: "student",
    surfaceNodeKind: "Num",
  };

  try {
    const result = await runV5Step(endpointUrl, v5Payload, 8000);

    if (
      result.status === "step-applied" &&
      result.engineResult?.newExpressionLatex
    ) {
      const newLatex = result.engineResult.newExpressionLatex;
      setCurrentLatex(newLatex);
      if (onSuccess) {
        onSuccess(newLatex);
      }
    }

    updateP1Diagnostics(
      {
        lastHintApplyStatus: result.status,
        lastHintApplyNewLatex: result.engineResult?.newExpressionLatex || "N/A",
      },
      currentLatex,
    );
  } catch (err) {
    console.error(`[P1-HINT-APPLY][ERROR] Exception:`, err);
    updateP1Diagnostics(
      {
        lastHintApplyStatus: "exception",
        lastHintApplyError: err instanceof Error ? err.message : String(err),
      },
      currentLatex,
    );
  }
}
