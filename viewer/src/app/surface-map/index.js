/**
 * @fileoverview Surface Map module entry point
 * Re-exports all surface map functionality for easy importing.
 */

// Core classes
export {
  SurfaceMapBuilder,
  buildSurfaceNodeMap,
} from "./surface-map-builder.js";
export { SurfaceNode, SurfaceNodeFactory } from "./surface-node.js";

// Utilities
export { BBoxUtils } from "./bbox-utils.js";
export { ContentSegmenter } from "./content-segmenter.js";
export { ElementClassifier } from "./element-classifier.js";
export { OperandFinder, getOperandNodes } from "./operand-finder.js";
export { OperatorNormalizer } from "./operator-normalizer.js";

// Hit testing
export { HitTester, hitTestPoint } from "./hit-tester.js";

// Serialization
export {
  SurfaceMapSerializer,
  surfaceMapToSerializable,
} from "./surface-map-serializer.js";

// Enhancement and correlation
export {
  SurfaceMapEnhancer,
  assertStableIdInjection,
  correlateIntegersWithAST,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
} from "./surface-map-enhancer.js";

// Constants (for advanced use)
export {
  ATOMIC_KINDS,
  INTERACTIVE_KINDS,
  OPERATOR_SLOT_KINDS,
  OP_CHARS,
  STRUCTURAL_CLASSES,
} from "./constants.js";
