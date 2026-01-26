/**
 * IntrospectRenderer.ts - Handles all UI rendering for introspect page
 */

import katex from "katex";
import { LOCAL_SUMMARY, SAMPLE_REQUEST } from "./constants";

export class IntrospectRenderer {
  private _summary: Record<string, any>;

  constructor(summary: Record<string, any>) {
    this._summary = summary;
  }

  setSummary(summary: Record<string, any>) {
    this._summary = summary;
  }

  getSummary(): Record<string, any> {
    return this._summary;
  }

  renderFormula() {
    const target = document.getElementById("formula-latex");
    if (!target) return;

    const latex = this._summary.latex || LOCAL_SUMMARY.latex;

    try {
      katex.render(latex, target, { throwOnError: false, displayMode: true });
    } catch (err) {
      console.error("Error rendering KaTeX formula:", err);
      target.textContent = latex;
    }
  }

  renderMeta() {
    const metaContainer = document.getElementById("meta-container");
    const pillRow = document.getElementById("pill-row");
    if (!metaContainer || !pillRow) return;

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

    pillRow.innerHTML = "";
    if (this._summary.chosenCandidate) {
      const { id, invariantId, engineOperation } =
        this._summary.chosenCandidate;

      this._createPill(pillRow, "Chosen", id);
      this._createPill(pillRow, "Invariant", invariantId);
      this._createPill(pillRow, "Operation", engineOperation);
    }
  }

  private _createPill(container: HTMLElement, key: string, value: string) {
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `<span class="key">${key}</span><span>${value}</span>`;
    container.appendChild(pill);
  }

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

  renderJsonBlocks(initial: boolean) {
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
