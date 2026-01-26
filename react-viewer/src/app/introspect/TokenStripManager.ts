/**
 * TokenStripManager.ts - Manages token strip UI
 */

import { TOKEN_DEFS } from "./constants";
import { SelectionManager } from "./SelectionManager";

export class TokenStripManager {
  private _selectionManager: SelectionManager;

  constructor(selectionManager: SelectionManager) {
    this._selectionManager = selectionManager;
  }

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

  private _handleTokenClick(regionId: string) {
    this._selectionManager.toggle(regionId);
    this.updateStyles();
    this.updateLabel();
  }

  updateStyles() {
    const strip = document.getElementById("token-strip");
    if (!strip) return;

    const buttons = strip.querySelectorAll(".token");
    buttons.forEach((btn) => {
      const regionId = (btn as HTMLElement).dataset.regionId;
      if (regionId && this._selectionManager.has(regionId)) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  updateLabel() {
    const labelEl = document.getElementById("selection-label");
    if (!labelEl) return;

    const ids = this._selectionManager.getSelection();
    labelEl.textContent =
      ids.length === 0
        ? "Current selection: (none)"
        : "Current selection: " + ids.join(", ");
  }

  updateLabelWithPrefix(prefix: string) {
    const labelEl = document.getElementById("selection-label");
    if (!labelEl) return;

    const ids = this._selectionManager.getSelection();
    labelEl.textContent = prefix + ids.join(", ");
  }
}
