/**
 * tokens.ts
 * Authoritative collection of injection tokens for the tsyringe container.
 */

export const Tokens = {
  // Core Infrastructure
  IFileBus: Symbol.for("IFileBus"),
  ILogger: Symbol.for("ILogger"),
  IApiClient: Symbol.for("IApiClient"),

  // Store & State
  IStoreService: Symbol.for("IStoreService"),

  // Domain - Math Engine
  ITokenizer: Symbol.for("ITokenizer"),
  IMathParser: Symbol.for("IMathParser"),
  IMathEngine: Symbol.for("IMathEngine"),

  // Domain - Surface Map
  IMapEngine: Symbol.for("IMapEngine"),
  IMapBuilder: Symbol.for("IMapBuilder"),
  INodeClassifier: Symbol.for("INodeClassifier"),
  IGeometryProvider: Symbol.for("IGeometryProvider"),

  // Domain - Interaction/Selection
  ISelectionService: Symbol.for("ISelectionService"),
  IInteractionService: Symbol.for("IInteractionService"),

  // Features
  IEngineBridge: Symbol.for("IEngineBridge"),
  ITraceRecorder: Symbol.for("ITraceRecorder"),
} as const;
