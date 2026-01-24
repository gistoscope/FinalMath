// features/p1/integer-click-handler.ts
// P1 Integer click handling logic

import {
  detectStep2MultiplierContext,
  getAstIdFromDOM,
} from "../../core/stable-id";
import {
  getCurrentLatex,
  integerCycleState,
  MODE_BLUE,
  MODE_CONFIG,
  MODE_GREEN,
  MODE_ORANGE,
  P1_DOUBLE_CLICK_THRESHOLD,
  restoreTokenModeState,
  saveTokenModeState,
  stableIdState,
} from "../../core/state";
import { updateP1Diagnostics } from "../../ui/diagnostics-panel";
import { applyIntegerHighlight } from "../../ui/hint-indicator";
import {
  applyCurrentHintForStableKey,
  ensureP1IntegerContext,
} from "./hint-actions";

let _onHintApplySuccess: ((newLatex: string) => void) | null = null;

/**
 * Set the callback for hint apply success
 */
export function setOnHintApplySuccess(callback: (newLatex: string) => void) {
  _onHintApplySuccess = callback;
}

/**
 * Handle client event for integer clicks
 */
export function handleClientEvent(ev: any) {
  if (
    ev &&
    ev.type === "click" &&
    ev.surfaceNodeKind &&
    (ev.surfaceNodeKind === "Num" ||
      ev.surfaceNodeKind === "Number" ||
      ev.surfaceNodeKind === "Integer")
  ) {
    handleIntegerClick(ev);
  }
}

/**
 * Handle integer click event
 */
export function handleIntegerClick(ev: any) {
  const clickCount = ev.click?.clickCount || 1;
  const surfaceId = ev.surfaceNodeId;
  const astId = ev.astNodeId;
  const now = Date.now();
  const clickedValue = ev.latexFragment || ev.surfaceNodeText || "?";

  console.log(
    `[P1-CLICK] Integer click event: surfaceId=${surfaceId}, astId=${astId || "MISSING!"}, value="${clickedValue}", clickCount=${clickCount}`,
  );

  if (!stableIdState.enabled) {
    console.warn(
      `[P1-CLICK] BLOCKED: Stable-ID disabled (${stableIdState.reason}). No precise clicks allowed.`,
    );
    alert(
      `Stable-ID is disabled for this expression. Precise clicks are not available.\n\nReason: ${stableIdState.reason}`,
    );
    return;
  }

  let effectiveAstId = astId;
  if (!effectiveAstId && typeof window !== "undefined") {
    const map = (window as any).__currentSurfaceMap;
    const surfaceNode = map?.atoms?.find((a: any) => a && a.id === surfaceId);
    if (surfaceNode && surfaceNode.dom) {
      effectiveAstId = getAstIdFromDOM(surfaceNode.dom);
    }
  }

  if (!effectiveAstId) {
    console.log(
      `[BUG] Missing data-ast-id for clickable element: surfaceId=${surfaceId} value="${clickedValue}"`,
    );
  }

  let clickStableKey: string | null = null;
  if (typeof window !== "undefined") {
    const map = (window as any).__currentSurfaceMap;
    const surfaceNode = map?.atoms?.find((a: any) => a && a.id === surfaceId);
    clickStableKey = surfaceNode?.stableKey || null;
  }

  console.log(`[P1-CLICK] StableKey: ${clickStableKey || "MISSING"}`);

  const isNonTargetable =
    effectiveAstId &&
    typeof effectiveAstId === "string" &&
    effectiveAstId.startsWith("NON_TARGETABLE:");

  if (isNonTargetable) {
    console.warn(
      `[P1-CLICK] Non-targetable integer (fraction child): ${effectiveAstId}`,
    );
    alert(
      "This number is inside a simple fraction and cannot be targeted individually (backend limitation).",
    );
    updateP1Diagnostics(
      {
        selectedSurfaceNodeId: surfaceId,
        resolvedAstNodeId: effectiveAstId,
        lastHintApplyError: "NON_TARGETABLE: fraction child",
        lastHintApplyStatus: "blocked",
      },
      getCurrentLatex(),
    );
    return;
  }

  if (typeof window !== "undefined" && (window as any).__traceHub) {
    (window as any).__traceHub.emit({
      module: "viewer.main",
      event: "VIEWER_INTEGER_CLICK_TARGETED",
      data: {
        latex: getCurrentLatex(),
        surfaceNodeId: surfaceId,
        value: clickedValue,
        selectionPath: effectiveAstId || "MISSING",
        clickCount,
      },
    });
  }

  if (
    clickCount === 2 &&
    integerCycleState.stableKey === clickStableKey &&
    integerCycleState.mode === MODE_BLUE
  ) {
    handleDoubleClickBlueMode(clickStableKey);
    return;
  }

  if (clickCount === 2) {
    handleDoubleClick(surfaceId, effectiveAstId, clickStableKey);
  } else if (clickCount === 1) {
    handleSingleClick(surfaceId, effectiveAstId, clickStableKey, astId, now);
  }
}

/**
 * Handle double-click in BLUE mode
 */
function handleDoubleClickBlueMode(clickStableKey: string | null) {
  integerCycleState.dblclickLockUntil = Date.now() + 300;
  const targetDenom = integerCycleState.step2Info?.oppositeDenom || "?";
  console.log(
    `[DOUBLE-CLICK APPLY via detail=2] stableKey=${clickStableKey} mode=${integerCycleState.mode} primitive=P.ONE_TO_TARGET_DENOM targetDenom=${targetDenom}`,
  );

  if (integerCycleState.pendingClickTimeout) {
    clearTimeout(integerCycleState.pendingClickTimeout);
    integerCycleState.pendingClickTimeout = null;
  }

  applyCurrentHintForStableKey("[DOUBLE-CLICK APPLY]", _onHintApplySuccess);
  integerCycleState.lastClickTime = 0;
  integerCycleState.lastClickNodeId = null;
}

/**
 * Handle double-click
 */
function handleDoubleClick(
  surfaceId: string,
  effectiveAstId: string | null,
  clickStableKey: string | null,
) {
  integerCycleState.dblclickLockUntil = Date.now() + 300;

  if (integerCycleState.pendingClickTimeout) {
    clearTimeout(integerCycleState.pendingClickTimeout);
    integerCycleState.pendingClickTimeout = null;
  }

  integerCycleState.selectedNodeId = surfaceId;
  integerCycleState.astNodeId = effectiveAstId;
  integerCycleState.stableKey = clickStableKey;

  const step2Ctx = detectStep2MultiplierContext(
    surfaceId,
    effectiveAstId,
    (window as any).__currentSurfaceMap,
    getCurrentLatex(),
  );
  integerCycleState.isStep2Context = step2Ctx.isStep2Context;
  integerCycleState.step2Info = step2Ctx.isStep2Context ? step2Ctx : null;

  if (integerCycleState.mode === MODE_GREEN) {
    console.log(
      `[APPLY BLOCKED] stableKey=${clickStableKey} mode=0 (GREEN) - double-click blocked`,
    );
    applyIntegerHighlight(surfaceId, MODE_GREEN, () =>
      applyCurrentHintForStableKey("[HINT-APPLY]", _onHintApplySuccess),
    );
    integerCycleState.lastClickTime = 0;
    integerCycleState.lastClickNodeId = null;
    return;
  }

  applyCurrentHintForStableKey("[DOUBLE-CLICK APPLY]", _onHintApplySuccess);
  integerCycleState.lastClickTime = 0;
  integerCycleState.lastClickNodeId = null;
}

/**
 * Handle single click
 */
function handleSingleClick(
  surfaceId: string,
  effectiveAstId: string | null,
  clickStableKey: string | null,
  astId: string | null,
  now: number,
) {
  const timeSinceLastClick = now - integerCycleState.lastClickTime;
  const sameNode = integerCycleState.lastClickNodeId === clickStableKey;

  if (sameNode && timeSinceLastClick < P1_DOUBLE_CLICK_THRESHOLD) {
    if (integerCycleState.pendingClickTimeout) {
      clearTimeout(integerCycleState.pendingClickTimeout);
      integerCycleState.pendingClickTimeout = null;
    }

    console.log(
      `[P1] Double-click detected (timing): stableKey=${clickStableKey}, deltaMs=${timeSinceLastClick}`,
    );
    integerCycleState.dblclickLockUntil = Date.now() + 300;

    if (integerCycleState.mode === MODE_GREEN) {
      console.log(
        `[APPLY BLOCKED] stableKey=${clickStableKey} mode=0 (GREEN) - timing double-click blocked`,
      );
      integerCycleState.lastClickTime = 0;
      integerCycleState.lastClickNodeId = null;
      return;
    }

    applyCurrentHintForStableKey("[DOUBLE-CLICK APPLY]", _onHintApplySuccess);
    integerCycleState.lastClickTime = 0;
    integerCycleState.lastClickNodeId = null;
  } else {
    if (integerCycleState.pendingClickTimeout) {
      clearTimeout(integerCycleState.pendingClickTimeout);
    }

    integerCycleState.lastClickTime = now;
    integerCycleState.lastClickNodeId = clickStableKey;

    integerCycleState.pendingClickTimeout = setTimeout(() => {
      integerCycleState.pendingClickTimeout = null;

      if (Date.now() < integerCycleState.dblclickLockUntil) {
        console.log(
          `[CYCLE SUPPRESSED] stableKey=${clickStableKey} reason=dblclick`,
        );
        return;
      }

      processSingleClick(surfaceId, effectiveAstId, clickStableKey, astId);
    }, P1_DOUBLE_CLICK_THRESHOLD);
  }
}

/**
 * Process a confirmed single click
 */
function processSingleClick(
  surfaceId: string,
  effectiveAstId: string | null,
  clickStableKey: string | null,
  astId: string | null,
) {
  if (integerCycleState.stableKey === clickStableKey) {
    const dt = Date.now() - integerCycleState.lastClickTime;
    const isDblClick = dt > 0 && dt <= 350;

    if (
      isDblClick &&
      integerCycleState.isStep2Context &&
      integerCycleState.mode === MODE_BLUE
    ) {
      console.log(
        `[DBL-DET] stableKey=${clickStableKey} dt=${dt} mode=2 isStep2=true action=APPLY`,
      );
      applyCurrentHintForStableKey("[DOUBLE-CLICK APPLY]", _onHintApplySuccess);
      integerCycleState.lastClickTime = 0;
      return;
    }

    const oldMode = integerCycleState.mode;
    let newMode: number;

    if (integerCycleState.isStep2Context) {
      newMode = oldMode === MODE_GREEN ? MODE_BLUE : MODE_GREEN;
    } else {
      newMode = oldMode === MODE_GREEN ? MODE_ORANGE : MODE_GREEN;
    }

    integerCycleState.mode = newMode;
    integerCycleState.cycleIndex = newMode;
    saveTokenModeState();
    const modeConfig = MODE_CONFIG[newMode as keyof typeof MODE_CONFIG];
    console.log(
      `[DBL-DET] stableKey=${clickStableKey} dt=${dt} mode=${oldMode} action=CYCLE`,
    );
    console.log(
      `[CYCLE] stableKey=${clickStableKey} mode ${oldMode}->${newMode} (${modeConfig.label}) isStep2=${integerCycleState.isStep2Context}`,
    );
  } else {
    saveTokenModeState();

    const restored = restoreTokenModeState(clickStableKey || "");
    integerCycleState.selectedNodeId = surfaceId;
    integerCycleState.astNodeId = effectiveAstId;
    integerCycleState.stableKey = clickStableKey;

    const step2Ctx = detectStep2MultiplierContext(
      surfaceId,
      effectiveAstId,
      (window as any).__currentSurfaceMap,
      getCurrentLatex(),
    );
    integerCycleState.isStep2Context = step2Ctx.isStep2Context;
    integerCycleState.step2Info = step2Ctx.isStep2Context ? step2Ctx : null;

    let validatedMode = restored.mode;
    if (restored.mode === MODE_BLUE && !step2Ctx.isStep2Context) {
      validatedMode = MODE_GREEN;
    }
    if (validatedMode === MODE_ORANGE && step2Ctx.isStep2Context) {
      validatedMode = MODE_GREEN;
    }

    integerCycleState.mode = validatedMode;
    integerCycleState.cycleIndex = validatedMode;
    saveTokenModeState();

    console.log(
      `[CYCLE] stableKey=${clickStableKey} mode=${integerCycleState.mode} isStep2=${integerCycleState.isStep2Context}${integerCycleState.step2Info?.oppositeDenom ? ` oppositeDenom=${integerCycleState.step2Info.oppositeDenom}` : ""}`,
    );
  }

  applyIntegerHighlight(surfaceId, integerCycleState.mode, () =>
    applyCurrentHintForStableKey("[HINT-APPLY]", _onHintApplySuccess),
  );

  updateP1Diagnostics(
    {
      selectedSurfaceNodeId: surfaceId,
      resolvedAstNodeId: integerCycleState.astNodeId || "MISSING",
      primitiveId:
        integerCycleState.primitives[integerCycleState.cycleIndex]?.id || "N/A",
    },
    getCurrentLatex(),
  );

  ensureP1IntegerContext(surfaceId, astId || integerCycleState.astNodeId).catch(
    (err) => {
      console.warn("[P1] ensureP1IntegerContext failed (single-click):", err);
    },
  );
}
