/**
 * MapMaster Rules Common
 *
 * Shared types and utilities for rule modules.
 */

import type { InvariantRule } from "../../../adapters/invarient-registry/type";
import { MapMasterInput } from "../../../mapmaster.types";
import { AstPath, ExpressionAstNode } from "../../helpers/ast.helpers";

/**
 * Context provided to rule modules for candidate generation.
 */
export interface RuleContext {
  /** The original MapMaster request */
  request: MapMasterInput;

  /** Path to the semantic window root */
  windowRootPath: AstPath;

  /** AST node at the semantic window root */
  windowRootNode: ExpressionAstNode;

  /** Invariant rules applicable to this window */
  invariantRules: InvariantRule[];
}

/**
 * Helper to filter rules by domain.
 */
export function filterRulesByDomain(rules: InvariantRule[], domain: string): InvariantRule[] {
  return rules.filter((r) => r.domain === domain);
}

/**
 * Helper to filter rules by operation.
 */
export function filterRulesByOperation(rules: InvariantRule[], operation: string): InvariantRule[] {
  return rules.filter((r: any) => r.operation === operation);
}
