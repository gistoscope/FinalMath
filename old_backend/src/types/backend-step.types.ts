/**
 * Backend Step Types
 *
 * Protocol types for step execution and hint requests.
 */

import type { UserRole } from "./user.types.js";

export { UserRole };

export interface HintRequest {
  sessionId: string;
  courseId: string;
  expressionLatex: string;
  selectionPath: string | null;
  userRole: UserRole;
}

export interface HintResponse {
  hintText: string;
  suggestedPrimitiveId?: string;
}

export interface StepChoice {
  id: string;
  label: string;
  primitiveId: string;
  targetNodeId?: string;
}

export interface PrimitiveDebugInfo {
  primitiveId: string;
  status: string;
  domain: string;
  reason: string;
}
