/**
 * introspect.js
 * Re-exports from the introspect module for backward compatibility.
 *
 * The implementation has been refactored into class-based modules:
 * - constants.js - Configuration and sample data
 * - SelectionManager.js - Token selection state management
 * - IntrospectRenderer.js - UI rendering
 * - TokenStripManager.js - Token strip UI
 * - HttpIntrospectClient.js - HTTP communication
 * - IntrospectPage.js - Main controller
 *
 * @see ./introspect/index.js
 */

export {
  // Constants
  CONFIG,
  // Classes
  HttpIntrospectClient,
  IntrospectPage,
  introspectPage,
  IntrospectRenderer,
  LOCAL_CANDIDATE_SURFACE_REGION_IDS,
  LOCAL_SUMMARY,
  SAMPLE_REQUEST,
  SelectionManager,
  TOKEN_DEFS,
  TokenStripManager,
} from "./introspect/index.js";
