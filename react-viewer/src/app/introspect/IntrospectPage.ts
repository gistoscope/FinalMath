/**
 * IntrospectPage.ts - Main controller class for introspect page
 */

import {
  LOCAL_CANDIDATE_SURFACE_REGION_IDS,
  LOCAL_SUMMARY,
  SAMPLE_REQUEST,
} from "./constants";
import { HttpIntrospectClient } from "./HttpIntrospectClient";
import { IntrospectRenderer } from "./IntrospectRenderer";
import { SelectionManager } from "./SelectionManager";
import { TokenStripManager } from "./TokenStripManager";

export class IntrospectPage {
  private _selectionManager: SelectionManager;
  private _renderer: IntrospectRenderer;
  private _tokenStrip: TokenStripManager;
  private _httpClient: HttpIntrospectClient;

  constructor() {
    this._selectionManager = new SelectionManager();
    this._renderer = new IntrospectRenderer(LOCAL_SUMMARY);
    this._tokenStrip = new TokenStripManager(this._selectionManager);
    this._httpClient = new HttpIntrospectClient();
  }

  get selectionManager(): SelectionManager {
    return this._selectionManager;
  }

  get renderer(): IntrospectRenderer {
    return this._renderer;
  }

  get tokenStrip(): TokenStripManager {
    return this._tokenStrip;
  }

  get httpClient(): HttpIntrospectClient {
    return this._httpClient;
  }

  init() {
    this._renderer.renderFormula();
    this._renderer.renderMeta();
    this._tokenStrip.render();
    this._renderer.renderJsonBlocks(true);
    this._renderer.renderStepMaster();
    this._setupControls();
  }

  setSelection(regionIds: string[]) {
    this._selectionManager.set(regionIds);
    this._tokenStrip.updateStyles();
    this._tokenStrip.updateLabel();
  }

  clearSelection() {
    this._selectionManager.clear();
    this._tokenStrip.updateStyles();
    this._tokenStrip.updateLabel();
  }

  async callHttpIntrospect() {
    const sumEl = document.getElementById("json-summary");
    const labelEl = document.getElementById("selection-label");

    if (sumEl) {
      sumEl.textContent = this._httpClient.getLoadingMessage();
    }

    try {
      const data = (await this._httpClient.call(SAMPLE_REQUEST)) as Record<
        string,
        any
      >;

      this._renderer.setSummary(data.summary);
      this._renderer.renderMeta();
      this._renderer.renderStepMaster();

      if (sumEl) {
        sumEl.textContent = JSON.stringify(data, null, 2);
      }

      this.setSelection(LOCAL_CANDIDATE_SURFACE_REGION_IDS);
      this._tokenStrip.updateLabelWithPrefix("Current selection (HTTP): ");
    } catch (err) {
      console.error("HTTP introspect failed", err);
      if (sumEl) sumEl.textContent = "HTTP error: " + String(err);
      if (labelEl) labelEl.textContent = "Current selection: (HTTP error)";
    }
  }

  private _setupControls() {
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
