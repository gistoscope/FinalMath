/**
 * @fileoverview Surface Map module - backward compatibility re-export
 *
 * This file re-exports all functionality from the surface-map/ folder
 * for backward compatibility with existing imports.
 *
 * The module has been refactored into separate files with proper
 * separation of concerns. See ./surface-map/ for the implementation.
 */

export {
  assertStableIdInjection,
  ATOMIC_KINDS,
  // Utilities
  BBoxUtils,
  buildSurfaceNodeMap,
  ContentSegmenter,
  correlateIntegersWithAST,
  correlateOperatorsWithAST,
  ElementClassifier,
  enhanceSurfaceMap,
  getOperandNodes,

  // Hit testing
  HitTester,
  hitTestPoint,
  INTERACTIVE_KINDS,
  // Constants
  OP_CHARS,
  OperandFinder,
  OPERATOR_SLOT_KINDS,
  OperatorNormalizer,
  STRUCTURAL_CLASSES,
  // Core builder
  SurfaceMapBuilder,
  // Enhancement and correlation
  SurfaceMapEnhancer,
  // Serialization
  SurfaceMapSerializer,
  surfaceMapToSerializable,
  // Node classes
  SurfaceNode,
  SurfaceNodeFactory,
} from "./surface-map/index.js";
