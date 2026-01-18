// features/engine/response-handler.js
// Engine response handling

import { getCurrentLatex, setCurrentLatex } from "../../core/state.js";
import { applyChoice, showChoicePopup } from "../../ui/choice-popup.js";
import {
  formatTsaInvariant,
  formatTsaOperator,
  formatTsaStrategy,
} from "../debug/formatters.js";

// Callback for rendering/rebuilding
let _renderFormula = null;
let _buildAndShowMap = null;
let _clearSelection = null;

/**
 * Set the callbacks for engine response handling
 */
export function setEngineResponseCallbacks(
  renderFormula,
  buildAndShowMap,
  clearSelection,
) {
  _renderFormula = renderFormula;
  _buildAndShowMap = buildAndShowMap;
  _clearSelection = clearSelection;
}

/**
 * Helper: Apply choice and update formula
 */
export function handleApplyChoice(primitiveId, targetPath, latex) {
  applyChoice(primitiveId, targetPath, latex, (newLatex) => {
    setCurrentLatex(newLatex);
    if (_clearSelection) _clearSelection("latex-changed");
    if (_renderFormula) _renderFormula();
    if (_buildAndShowMap) _buildAndShowMap();
  });
}

/**
 * Handle engine response
 * @param {object} res - Engine response
 * @param {object} debugState - Debug state object
 */
export function handleEngineResponse(res, debugState) {
  const tsa = res?.result?.meta?.tsa || null;
  debugState.lastTsa = tsa;

  if (tsa) {
    const entry = {
      ts: new Date().toISOString(),
      operator: formatTsaOperator(tsa),
      strategy: formatTsaStrategy(tsa),
      invariant: formatTsaInvariant(tsa),
      before: tsa.localWindowBefore || tsa.latexBefore || "",
      after: tsa.localWindowAfter || tsa.latexAfter || "",
    };
    debugState.tsaLog.push(entry);
    if (debugState.tsaLog.length > 12) {
      debugState.tsaLog.shift();
    }
  }

  if (
    res &&
    res.type === "ok" &&
    res.requestType &&
    res.result &&
    typeof res.result.latex === "string"
  ) {
    const status = res.result.meta ? res.result.meta.backendStatus : null;
    const shouldApply =
      res.requestType === "applyStep" && status === "step-applied";

    if (shouldApply) {
      const newLatex = res.result.latex;
      if (newLatex && typeof newLatex === "string") {
        const oldLatex = getCurrentLatex();
        setCurrentLatex(newLatex);
        if (oldLatex !== newLatex) {
          if (_clearSelection) _clearSelection("latex-changed");
        }
        if (_renderFormula) _renderFormula();
        if (_buildAndShowMap) _buildAndShowMap();
      }
    }

    if (status === "choice" && res.result.meta && res.result.meta.choices) {
      const choices = res.result.meta.choices;
      const clickContext = res.result.meta.clickContext || {};
      console.log(
        "[MainJS] Choice response - showing popup",
        choices,
        clickContext,
      );
      showChoicePopup(
        choices,
        clickContext,
        res.result.latex,
        handleApplyChoice,
      );
    }
  }
}
