import { InvariantRuleDefinition } from '../../../invariants/invariant.types';
import { InvariantPattern } from '../../../invariants/invarient-registry/invarient-registry.type';
import { MapMasterInput } from '../../mapmaster.types';
import {
  AstPath,
  ExpressionAstNode,
} from '../../providers/helpers/ast.helpers';

export interface InvariantRule extends InvariantRuleDefinition {
  domain: string;
  pattern?: InvariantPattern;
}
export interface InvariantRegistryAdapter {
  /**
   * Get invariant rules applicable to a semantic window.
   *
   * @param request - The MapMaster request
   * @param windowRootPath - Path to the window root in the AST
   * @param windowRootNode - The AST node at the window root
   * @returns Array of applicable invariant rules
   */
  getInvariantRulesForRequest(
    request: MapMasterInput,
    windowRootPath: AstPath,
    windowRootNode: ExpressionAstNode,
  ): InvariantRule[];
}
