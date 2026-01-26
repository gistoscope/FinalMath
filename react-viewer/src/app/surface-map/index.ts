/**
 * @fileoverview Surface Map module entry point
 * Re-exports all surface map functionality for easy importing.
 */

// Core classes
export { SurfaceMapBuilder, buildSurfaceNodeMap } from "./surface-map-builder";
export { SurfaceNode, SurfaceNodeFactory } from "./surface-node";

// Utilities
export { BBoxUtils } from "./bbox-utils";
export { ContentSegmenter } from "./content-segmenter";
export { ElementClassifier } from "./element-classifier";
export { OperandFinder, getOperandNodes } from "./operand-finder";
export { OperatorNormalizer } from "./operator-normalizer";

// Hit testing
export { HitTester, hitTestPoint } from "./hit-tester";

// Serialization
export {
  SurfaceMapSerializer,
  surfaceMapToSerializable,
} from "./surface-map-serializer";

// Enhancement and correlation
export {
  SurfaceMapEnhancer,
  assertStableIdInjection,
  correlateIntegersWithAST,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
} from "./surface-map-enhancer";

// Constants (for advanced use)
export {
  ATOMIC_KINDS,
  INTERACTIVE_KINDS,
  OPERATOR_SLOT_KINDS,
  OP_CHARS,
  STRUCTURAL_CLASSES,
} from "./constants";
