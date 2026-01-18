/**
 * IntrospectPage.js - Main controller class for introspect page
 */

import {
  LOCAL_CANDIDATE_SURFACE_REGION_IDS,
  LOCAL_SUMMARY,
  SAMPLE_REQUEST,
} from "./constants.js";
import { HttpIntrospectClient } from "./HttpIntrospectClient.js";
import { IntrospectRenderer } from "./IntrospectRenderer.js";
import { SelectionManager } from "./SelectionManager.js";
import { TokenStripManager } from "./TokenStripManager.js";

/**
 * IntrospectPage - Main controller class.
 */
export class IntrospectPage {
  constructor() {
    this._selectionManager = new SelectionManager();
    this._renderer = new IntrospectRenderer(LOCAL_SUMMARY);
    this._tokenStrip = new TokenStripManager(this._selectionManager);
    this._httpClient = new HttpIntrospectClient();
  }

  /**
   * Get the selection manager.
   * @returns {SelectionManager}
   */
  get selectionManager() {
    return this._selectionManager;
  }

  /**
   * Get the renderer.
   * @returns {IntrospectRenderer}
   */
  get renderer() {
    return this._renderer;
  }

  /**
   * Get the token strip manager.
   * @returns {TokenStripManager}
   */
  get tokenStrip() {
    return this._tokenStrip;
  }

  /**
   * Get the HTTP client.
   * @returns {HttpIntrospectClient}
   */
  get httpClient() {
    return this._httpClient;
  }

  /**
   * Initialize the page.
   */
  init() {
    this._renderer.renderFormula();
    this._renderer.renderMeta();
    this._tokenStrip.render();
    this._renderer.renderJsonBlocks(true);
    this._renderer.renderStepMaster();
    this._setupControls();
  }

  /**
   * Set selection to specific regions.
   * @param {string[]} regionIds
   */
  setSelection(regionIds) {
    this._selectionManager.set(regionIds);
    this._tokenStrip.updateStyles();
    this._tokenStrip.updateLabel();
  }

  /**
   * Clear current selection.
   */
  clearSelection() {
    this._selectionManager.clear();
    this._tokenStrip.updateStyles();
    this._tokenStrip.updateLabel();
  }

  /**
   * Call HTTP introspect endpoint.
   */
  async callHttpIntrospect() {
    const sumEl = document.getElementById("json-summary");
    const labelEl = document.getElementById("selection-label");

    // Show loading state
    if (sumEl) {
      sumEl.textContent = this._httpClient.getLoadingMessage();
    }

    try {
      const data = await this._httpClient.call(SAMPLE_REQUEST);

      // Update renderer with new summary
      this._renderer.setSummary(data.summary);
      this._renderer.renderMeta();
      this._renderer.renderStepMaster();

      if (sumEl) {
        sumEl.textContent = JSON.stringify(data, null, 2);
      }

      // Update selection
      this.setSelection(LOCAL_CANDIDATE_SURFACE_REGION_IDS);
      this._tokenStrip.updateLabelWithPrefix("Current selection (HTTP): ");
    } catch (err) {
      console.error("HTTP introspect failed", err);
      if (sumEl) sumEl.textContent = "HTTP error: " + String(err);
      if (labelEl) labelEl.textContent = "Current selection: (HTTP error)";
    }
  }

  /**
   * Setup control button event handlers.
   * @private
   */
  _setupControls() {
    const btnHighlight = document.getElementById("btn-highlight");
    const btnClear = document.getElementById("btn-clear");
    const btnHttp = document.getElementById("btn-http");

    if (btnHighlight) {
      btnHighlight.addEventListener("click", () => {
        this.setSelection(LOCAL_CANDIDATE_SURFACE_REGION_IDS);
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", () => {
        this.clearSelection();
      });
    }

    if (btnHttp) {
      btnHttp.addEventListener("click", () => {
        this.callHttpIntrospect();
      });
    }
  }
}
