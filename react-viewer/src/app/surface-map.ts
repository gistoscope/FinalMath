/**
 * @fileoverview Surface Map module - backward compatibility re-export
 */

export {
  ATOMIC_KINDS,
  BBoxUtils,
  ContentSegmenter,
  ElementClassifier,
  HitTester,
  INTERACTIVE_KINDS,
  OPERATOR_SLOT_KINDS,
  OP_CHARS,
  OperandFinder,
  OperatorNormalizer,
  STRUCTURAL_CLASSES,
  SurfaceMapBuilder,
  SurfaceMapEnhancer,
  SurfaceMapSerializer,
  SurfaceNode,
  SurfaceNodeFactory,
  assertStableIdInjection,
  buildSurfaceNodeMap,
  correlateIntegersWithAST,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
  getOperandNodes,
  hitTestPoint,
  surfaceMapToSerializable,
} from "./surface-map/index";
