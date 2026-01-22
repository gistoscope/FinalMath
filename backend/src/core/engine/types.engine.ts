/**
 * Engine Types
 *
 * Type definitions for step execution.
 */

import { InvariantRuleId } from "../invariants";
import { PrimitiveId } from "../primitive-master";

export interface EngineStepExecutionResult {
  ok: boolean;
  newExpressionLatex?: string;
  errorCode?: string;
}

export interface EngineStepInput {
  expressionLatex: string;
  primitiveId: string;
  targetPath: string;
  bindings?: Record<string, unknown>;
  invariantRuleId?: string;
  resultPattern?: string;
}
export interface EngineStepExecutionRequest {
  expressionLatex: string;
  targetPath: string;
  primitiveId: PrimitiveId;
  invariantRuleId: InvariantRuleId;
  bindings?: Record<string, any>;
  resultPattern?: string;
}
