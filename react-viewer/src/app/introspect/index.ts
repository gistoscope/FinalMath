/**
 * introspect/index.ts - Main entry point for introspect module
 */

// Export constants
export {
  CONFIG,
  LOCAL_CANDIDATE_SURFACE_REGION_IDS,
  LOCAL_SUMMARY,
  SAMPLE_REQUEST,
  TOKEN_DEFS,
} from "./constants";

// Export classes
export { HttpIntrospectClient } from "./HttpIntrospectClient";
export { IntrospectPage } from "./IntrospectPage";
export { IntrospectRenderer } from "./IntrospectRenderer";
export { SelectionManager } from "./SelectionManager";
export { TokenStripManager } from "./TokenStripManager";

// Create and export singleton instance
import { IntrospectPage } from "./IntrospectPage";

const introspectPage = new IntrospectPage();

export { introspectPage };
