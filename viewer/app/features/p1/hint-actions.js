// features/p1/hint-actions.js
// P1 hint actions and apply functions

import { runV5Step } from "../../client/orchestratorV5Client.js";
import { getV5EndpointUrl } from "../../core/api.js";
import { detectStep2MultiplierContext } from "../../core/stable-id.js";
import {
  getCurrentLatex,
  hintApplyState,
  integerCycleState,
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
  MODE_ORANGE,
  setCurrentLatex,
} from "../../core/state.js";
import { updateP1Diagnostics } from "../../ui/diagnostics-panel.js";

/**
 * SINGLE GATEWAY for all apply actions (hint click, double-click)
 * Reads mode from state at call time - no captured parameters.
 * @param {string} logPrefix - "[HINT-APPLY]" or "[DOUBLE-CLICK APPLY]"
 * @param {Function} onSuccess - Callback on successful apply (receives newLatex)
 */
export async function applyCurrentHintForStableKey(
  logPrefix = "[HINT-APPLY]",
  onSuccess = null,
) {
  // Read state at call time
  const currentMode = integerCycleState.mode;
  const currentStableKey = integerCycleState.stableKey;
  const currentAstId = integerCycleState.astNodeId;
  const currentSurfaceId = integerCycleState.selectedNodeId;
  const currentLatex = getCurrentLatex();

  // MODE 0 (GREEN) normally = selection only, no apply.
  // BUT: user expectation for P1 integers is that DOUBLE-CLICK in GREEN applies INT_TO_FRAC
  // (unless this is a protected Step2 multiplier-1 token).
  if (currentMode === MODE_GREEN) {
    const isStep2 = !!integerCycleState.isStep2Context;
    const isDoubleClickApply =
      typeof logPrefix === "string" && logPrefix.indexOf("DOUBLE-CLICK") >= 0;

    if (isDoubleClickApply && !isStep2) {
      console.log(
        `[GREEN-DBLCLICK] Treat GREEN as ORANGE for P1: stableKey=${currentStableKey} -> primitive=P.INT_TO_FRAC`,
      );
      // Override primitive for this apply
      // (keeps UI in GREEN, but performs the expected conversion)
    } else {
      console.log(
        `[APPLY BLOCKED] stableKey=${currentStableKey} mode=0 (GREEN) - selection only`,
      );
      return { applied: false, reason: "mode-0" };
    }
  }

  // Prevent re-entry
  if (hintApplyState.applying) {
    console.log(`${logPrefix} Ignored: already applying`);
    return { applied: false, reason: "re-entry" };
  }

  // Get primitiveId from MODE_CONFIG
  const modeConfig = MODE_CONFIG[currentMode];
  let primitiveId = modeConfig?.primitiveId;

  // If GREEN + DOUBLE-CLICK and not Step2: allow P1 INT_TO_FRAC apply.
  if (currentMode === MODE_GREEN) {
    const isStep2 = !!integerCycleState.isStep2Context;
    const isDoubleClickApply =
      typeof logPrefix === "string" && logPrefix.indexOf("DOUBLE-CLICK") >= 0;
    if (isDoubleClickApply && !isStep2) {
      primitiveId = "P.INT_TO_FRAC";
    }
  }

  // Part C: Block ORANGE mode for multiplier-1 tokens (prevents killing Step2)
  if (currentMode === MODE_ORANGE && integerCycleState.isStep2Context) {
    console.log(
      `[APPLY BLOCKED] stableKey=${currentStableKey} mode=1 (ORANGE) - multiplier-1 cannot use INT_TO_FRAC (would kill Step2)`,
    );
    return { applied: false, reason: "multiplier-1-protected" };
  }

  // For BLUE mode with Step2 info, ensure correct primitive
  if (currentMode === MODE_BLUE && integerCycleState.step2Info) {
    primitiveId = "P.ONE_TO_TARGET_DENOM";
  }

  if (!primitiveId) {
    console.warn(
      `${logPrefix} BLOCKED: No primitiveId for mode=${currentMode}`,
    );
    return { applied: false, reason: "no-primitive" };
  }

  // Log target denom for BLUE mode
  const targetDenom =
    currentMode === MODE_BLUE && integerCycleState.step2Info
      ? integerCycleState.step2Info.oppositeDenom
      : null;
  console.log(
    `${logPrefix} stableKey=${currentStableKey} astId=${currentAstId} mode=${currentMode} primitive=${primitiveId}${targetDenom ? ` targetDenom=${targetDenom}` : ""}`,
  );

  hintApplyState.applying = true;

  try {
    // Get endpoint
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
 * This makes hint-apply robust even when surface map correlation fails (astNodeId missing).
 */
export async function ensureP1IntegerContext(
  surfaceNodeId,
  fallbackAstNodeId = null,
) {
  const currentLatex = getCurrentLatex();

  // 1) Prefer explicit astNodeId from event/state
  let astNodeId = fallbackAstNodeId || integerCycleState.astNodeId || null;

  // 2) Try to find it on the current surface map (if available)
  if (
    !astNodeId &&
    typeof window !== "undefined" &&
    window.__currentSurfaceMap &&
    Array.isArray(window.__currentSurfaceMap.atoms)
  ) {
    const node = window.__currentSurfaceMap.atoms.find(
      (a) => a && a.id === surfaceNodeId,
    );
    if (node && node.astNodeId) astNodeId = node.astNodeId;
  }

  // 3) If we still don't have it OR we want authoritative choices, ask backend for a "choice" response.
  const endpointUrl = getV5EndpointUrl();

  const choicePayload = {
    sessionId: "default-session",
    expressionLatex: currentLatex,
    selectionPath: astNodeId, // may be null
    userRole: "student",
    userId: "student",
    courseId: "default",
    surfaceNodeKind: "Num",
    // IMPORTANT: no preferredPrimitiveId here; we want status="choice"
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

  // Backend standardized response: { status, choices, rawResponse.json.debugInfo ... }
  if (
    result &&
    (String(result.status || "") === "choice" ||
      String(result.status || "").includes("choice")) &&
    Array.isArray(result.choices) &&
    result.choices.length > 0
  ) {
    const choices = result.choices;

    // If backend provides a targetNodeId, use it as authoritative astNodeId
    const targetNodeId = choices[0].targetNodeId || astNodeId || null;
    astNodeId = targetNodeId;

    // Rebuild primitives list from backend choices (stable + future-proof)
    integerCycleState.primitives = choices.map((c, idx) => ({
      id: c.primitiveId,
      label: c.label,
      // Color convention: first choice = green; others = orange (until we add richer palette)
      color: idx === 0 ? "#4CAF50" : "#FF9800",
      targetNodeId: c.targetNodeId || targetNodeId,
    }));

    // STEP 2: Add third hint for "1" multiplier in diff denom flow
    const step2Context = detectStep2MultiplierContext(
      surfaceNodeId,
      astNodeId,
      window.__currentSurfaceMap,
      currentLatex,
    );
    if (step2Context.isStep2Context) {
      // Add the P.ONE_TO_TARGET_DENOM hint as third option (blue color)
      integerCycleState.primitives.push({
        id: "P.ONE_TO_TARGET_DENOM",
        label: `Convert 1 → ${step2Context.oppositeDenom}/${step2Context.oppositeDenom}`,
        color: "#2196F3", // Blue for Step 2
        targetNodeId: step2Context.path,
        isStep2: true,
        oppositeDenom: step2Context.oppositeDenom,
        side: step2Context.side,
      });

      // INT-CYCLE logging
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

    // Keep integerCycleState.astNodeId in sync
    integerCycleState.astNodeId = astNodeId;
    return { astNodeId, primitives: integerCycleState.primitives };
  }

  // Not a choice response or error
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

  // Still return what we have (may be null)
  integerCycleState.astNodeId = astNodeId;
  return { astNodeId, primitives: integerCycleState.primitives };
}

/**
 * P1: Apply action for the current mode (GREEN or ORANGE)
 * This sends an applyStep request to the backend
 */
export async function applyP1Action(
  surfaceNodeId,
  astNodeId,
  cycleIndex,
  onSuccess = null,
) {
  const currentLatex = getCurrentLatex();

  // Ensure we have an AST selectionPath. If missing, try to resolve via backend choice response.
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

  console.log(`[P1-APPLY] === Hint/DblClick Apply Action ===`);
  console.log(`[P1-APPLY] surfaceNodeId: ${surfaceNodeId}`);
  console.log(`[P1-APPLY] astNodeId (param): ${astNodeId}`);
  console.log(
    `[P1-APPLY] integerCycleState.astNodeId: ${integerCycleState.astNodeId}`,
  );
  console.log(`[P1-APPLY] primitive: ${primitive.id}`);
  console.log(`[P1-APPLY] currentLatex: "${currentLatex}"`);

  // ROBUST FALLBACK CHAIN for selectionPath
  let targetPath = astNodeId || integerCycleState.astNodeId;

  // If still no targetPath, try to look it up from the current surface map
  if (
    !targetPath &&
    surfaceNodeId &&
    typeof window !== "undefined" &&
    window.__currentSurfaceMap
  ) {
    const map = window.__currentSurfaceMap;
    const surfaceNode = map.atoms?.find((n) => n.id === surfaceNodeId);
    if (surfaceNode && surfaceNode.astNodeId) {
      targetPath = surfaceNode.astNodeId;
      console.log(
        `[P1-APPLY] Found astNodeId from surface map: "${targetPath}"`,
      );
    }
  }

  // Check if we need "root" fallback - ONLY for isolated integers
  if (!targetPath) {
    const latex = typeof currentLatex === "string" ? currentLatex.trim() : "";
    const isIsolatedInteger = /^-?\d+$/.test(latex);

    if (isIsolatedInteger) {
      targetPath = "root";
      console.log(
        `[P1-APPLY] Using "root" - expression "${latex}" is an isolated integer`,
      );
    } else {
      console.error(
        `[P1-APPLY] ERROR: No valid astNodeId for non-isolated integer expression!`,
      );
      console.error(
        `[P1-APPLY] ABORTING - would incorrectly target root node.`,
      );
      return;
    }
  }

  console.log(`[P1-APPLY] targetPath (resolved): ${targetPath}`);

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

  console.log(`[P1-HINT-APPLY] primitiveId: ${primitive.id}`);
  console.log(`[P1-HINT-APPLY] selectionPath: ${targetPath}`);

  // TraceHub: Emit VIEWER_HINT_APPLY_REQUEST
  if (typeof window !== "undefined" && window.__traceHub) {
    window.__traceHub.emit({
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

    // TraceHub: Emit VIEWER_HINT_APPLY_RESPONSE
    if (typeof window !== "undefined" && window.__traceHub) {
      window.__traceHub.emit({
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

    console.log(`[P1-HINT-APPLY] response status: ${result.status}`);

    if (
      result.status === "step-applied" &&
      result.engineResult?.newExpressionLatex
    ) {
      const newLatex = result.engineResult.newExpressionLatex;
      console.log(
        `[P1-HINT-APPLY] SUCCESS! Updating expression to: ${newLatex}`,
      );
      setCurrentLatex(newLatex);
      if (onSuccess) {
        onSuccess(newLatex);
      }
    } else if (result.status === "no-candidates") {
      console.warn(
        `[P1-HINT-APPLY] No candidates found for primitive ${primitive.id}.`,
      );
    } else if (result.status === "choice") {
      console.warn(
        `[P1-HINT-APPLY] Got 'choice' response but expected 'step-applied'.`,
      );
    } else if (result.status === "engine-error") {
      console.error(`[P1-HINT-APPLY][ERROR] Engine error:`, result.rawResponse);
    }
  } catch (err) {
    console.error(`[P1-HINT-APPLY][ERROR] Exception calling backend:`, err);
  }
}

/**
 * P1: Apply action with explicit primitiveId (mode-based, not array-based)
 */
export async function applyP1ActionWithPrimitive(
  surfaceNodeId,
  astNodeId,
  primitiveId,
  onSuccess = null,
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

  console.log(`[P1-HINT-APPLY] primitiveId: ${primitiveId}`);
  console.log(`[P1-HINT-APPLY] selectionPath: ${astNodeId || "root"}`);
  console.log(`[P1-HINT-APPLY] request URL: ${endpointUrl}`);

  try {
    const result = await runV5Step(endpointUrl, v5Payload, 8000);

    console.log(`[P1-HINT-APPLY] response status: ${result.status}`);

    if (
      result.status === "step-applied" &&
      result.engineResult?.newExpressionLatex
    ) {
      const newLatex = result.engineResult.newExpressionLatex;
      console.log(
        `[P1-HINT-APPLY] SUCCESS! Updating expression to: ${newLatex}`,
      );
      setCurrentLatex(newLatex);
      if (onSuccess) {
        onSuccess(newLatex);
      }
    } else {
      console.warn(`[P1-HINT-APPLY] Response status: ${result.status}`);
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
