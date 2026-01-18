/**
 * introspect/index.js - Main entry point for introspect module
 *
 * Re-exports all classes and constants for the introspect page.
 */

// Export constants
export {
  CONFIG,
  LOCAL_CANDIDATE_SURFACE_REGION_IDS,
  LOCAL_SUMMARY,
  SAMPLE_REQUEST,
  TOKEN_DEFS,
} from "./constants.js";

// Export classes
export { HttpIntrospectClient } from "./HttpIntrospectClient.js";
export { IntrospectPage } from "./IntrospectPage.js";
export { IntrospectRenderer } from "./IntrospectRenderer.js";
export { SelectionManager } from "./SelectionManager.js";
export { TokenStripManager } from "./TokenStripManager.js";

// Create and export singleton instance
import { IntrospectPage } from "./IntrospectPage.js";

const introspectPage = new IntrospectPage();

export { introspectPage };

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  introspectPage.init();
});
