/**
 * Core Stubs (Bridge to src)
 *
 * This file now exports the REAL implementations from ../../../src
 * to make src_new functionally identical to src.
 */

export * from "./protocol/backend-step.types";
export { SessionService } from "./session/session.service";

// Policies
export {
  createDefaultStudentPolicy,
  createTeacherDebugPolicy,
  type StepPolicyConfig,
} from "./stepmaster";

// Orchestrator
export {
  runOrchestratorStep,
  type OrchestratorContext,
  type OrchestratorStepRequest,
  type OrchestratorStepResult,
} from "./orchestrator/index";

export type { EngineStepExecutionResult } from "./engine/index";

// Invariants
export { type InMemoryInvariantRegistry } from "./invariants/index";

// Primitives
export { type PrimitiveMaster } from "./primitive-master/PrimitiveMaster";

// Debug
export { StepSnapshotStore } from "./debug/StepSnapshotStore";
export { TraceHub } from "./debug/TraceHub";

// AST
export {
  toInstrumentedLatex as instrumentLatex,
  parseExpression,
  type AstNode as ExpressionAstNode,
} from "./mapmaster/ast";

// =============================================================================
// TESTING HELPERS (Backwards compatibility for tests that relied on stubs)
// =============================================================================

export function createStubInvariantRegistry() {
  return {
    getInvariantSetById(id: string) {
      return {
        id,
        name: `Stub Set: ${id}`,
        rules: [],
      };
    },
  };
}
