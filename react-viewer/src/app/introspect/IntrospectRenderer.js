/**
 * IntrospectRenderer.js - Handles all UI rendering for introspect page
 */

import { LOCAL_SUMMARY, SAMPLE_REQUEST } from "./constants.js";

/**
 * IntrospectRenderer - Handles all UI rendering.
 */
export class IntrospectRenderer {
  /**
   * @param {Object} summary - Current summary data
   */
  constructor(summary) {
    this._summary = summary;
  }

  /**
   * Update the summary data.
   * @param {Object} summary
   */
  setSummary(summary) {
    this._summary = summary;
  }

  /**
   * Get current summary.
   * @returns {Object}
   */
  getSummary() {
    return this._summary;
  }

  /**
   * Render the formula using KaTeX.
   */
  renderFormula() {
    const target = document.getElementById("formula-latex");
    if (!target) return;

    const latex = this._summary.latex || LOCAL_SUMMARY.latex;

    if (typeof katex === "undefined") {
      target.textContent = latex;
      return;
    }

    try {
      katex.render(latex, target, { throwOnError: false, displayMode: true });
    } catch (err) {
      console.error("Error rendering KaTeX formula:", err);
      target.textContent = latex;
    }
  }

  /**
   * Render metadata and pills.
   */
  renderMeta() {
    const metaContainer = document.getElementById("meta-container");
    const pillRow = document.getElementById("pill-row");
    if (!metaContainer || !pillRow) return;

    // Render meta items
    metaContainer.innerHTML = "";
    const metaItems = [
      { label: "Expression ID", value: this._summary.expressionId },
      { label: "Invariant Set", value: this._summary.invariantSetId },
      { label: "Stage1 View", value: this._summary.engineStage1 },
      { label: "Candidates", value: String(this._summary.candidateCount) },
    ];

    for (const item of metaItems) {
      const div = document.createElement("div");
      div.className = "meta-item";

      const label = document.createElement("div");
      label.className = "meta-label";
      label.textContent = item.label;

      const value = document.createElement("div");
      value.className = "meta-value";
      value.textContent = item.value;

      div.appendChild(label);
      div.appendChild(value);
      metaContainer.appendChild(div);
    }

    // Render pills
    pillRow.innerHTML = "";
    if (this._summary.chosenCandidate) {
      const { id, invariantId, engineOperation } =
        this._summary.chosenCandidate;

      this._createPill(pillRow, "Chosen", id);
      this._createPill(pillRow, "Invariant", invariantId);
      this._createPill(pillRow, "Operation", engineOperation);
    }
  }

  /**
   * Create and append a pill element.
   * @param {HTMLElement} container
   * @param {string} key
   * @param {string} value
   * @private
   */
  _createPill(container, key, value) {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `<span class="key">${key}</span><span>${value}</span>`;
    container.appendChild(pill);
  }

  /**
   * Render StepMaster micro-steps.
   */
  renderStepMaster() {
    const container = document.getElementById("stepmaster-steps");
    if (!container) return;

    const sm = this._summary && this._summary.stepMaster;
    if (!sm || !Array.isArray(sm.microSteps) || sm.microSteps.length === 0) {
      container.innerHTML =
        '<div class="hint">No StepMaster micro-steps yet. Call HTTP introspect.</div>';
      return;
    }

    const parts = [];
    parts.push(
      `<div class="meta">Scenario: <strong>${sm.scenarioId}</strong> · Invariant: <code>${sm.invariantId}</code></div>`,
    );
    parts.push('<ol class="stepmaster-list">');

    for (const step of sm.microSteps) {
      const desc =
        step.description && step.description.shortStudent
          ? step.description.shortStudent
          : "";

      parts.push('<li class="stepmaster-item">');
      parts.push(`<div class="step-kind-pill">${step.kind || "step"}</div>`);
      parts.push(
        `<div class="step-latex"><code>${step.fromLatex}</code> → <code>${step.toLatex}</code></div>`,
      );
      if (desc) {
        parts.push(`<div class="step-desc">${desc}</div>`);
      }
      parts.push("</li>");
    }

    parts.push("</ol>");
    container.innerHTML = parts.join("");
  }

  /**
   * Render JSON blocks.
   * @param {boolean} initial - Whether this is the initial render
   */
  renderJsonBlocks(initial) {
    const reqEl = document.getElementById("json-request");
    const sumEl = document.getElementById("json-summary");
    if (!reqEl || !sumEl) return;

    const fingerprint = {
      mode: SAMPLE_REQUEST.mode,
      expression: SAMPLE_REQUEST.expression,
      policy: SAMPLE_REQUEST.policy,
      engineView: SAMPLE_REQUEST.engineView,
      tsaSelection: SAMPLE_REQUEST.tsaSelection,
    };
    reqEl.textContent = JSON.stringify(fingerprint, null, 2);

    if (initial) {
      sumEl.textContent = JSON.stringify(
        { source: "local-demo", summary: LOCAL_SUMMARY },
        null,
        2,
      );
    }
  }
}
