/**
 * TokenStripManager.js - Manages token strip UI
 */

import { TOKEN_DEFS } from "./constants.js";

/**
 * TokenStripManager - Manages token strip UI.
 */
export class TokenStripManager {
  /**
   * @param {import('./SelectionManager.js').SelectionManager} selectionManager
   */
  constructor(selectionManager) {
    this._selectionManager = selectionManager;
  }

  /**
   * Render token strip buttons.
   */
  render() {
    const strip = document.getElementById("token-strip");
    if (!strip) return;

    strip.innerHTML = "";

    for (const token of TOKEN_DEFS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "token";
      btn.dataset.regionId = token.id;

      const textSpan = document.createElement("span");
      textSpan.textContent = token.label;

      const codeSpan = document.createElement("span");
      codeSpan.className = "token-code";
      codeSpan.textContent = token.id;

      btn.appendChild(textSpan);
      btn.appendChild(codeSpan);

      btn.addEventListener("click", () => this._handleTokenClick(token.id));
      strip.appendChild(btn);
    }

    this.updateStyles();
    this.updateLabel();
  }

  /**
   * Handle token click.
   * @param {string} regionId
   * @private
   */
  _handleTokenClick(regionId) {
    this._selectionManager.toggle(regionId);
    this.updateStyles();
    this.updateLabel();
  }

  /**
   * Update token button styles based on selection.
   */
  updateStyles() {
    const strip = document.getElementById("token-strip");
    if (!strip) return;

    const buttons = strip.querySelectorAll(".token");
    buttons.forEach((btn) => {
      const regionId = btn.dataset.regionId;
      if (regionId && this._selectionManager.has(regionId)) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  /**
   * Update selection label.
   */
  updateLabel() {
    const labelEl = document.getElementById("selection-label");
    if (!labelEl) return;

    const ids = this._selectionManager.getSelection();
    labelEl.textContent =
      ids.length === 0
        ? "Current selection: (none)"
        : "Current selection: " + ids.join(", ");
  }

  /**
   * Update label with custom prefix.
   * @param {string} prefix
   */
  updateLabelWithPrefix(prefix) {
    const labelEl = document.getElementById("selection-label");
    if (!labelEl) return;

    const ids = this._selectionManager.getSelection();
    labelEl.textContent = prefix + ids.join(", ");
  }
}
