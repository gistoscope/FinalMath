import type { MapMasterCandidate, MapMasterInput } from "../../mapmaster.types";
import type { ExpressionAstNode } from "../helpers/ast.helpers";

/**
 * Interface for providing MapMaster rules and candidates.
 */
export interface IMapMasterRuleProvider {
  /**
   * Build step candidates for a given request.
   * @param request - The MapMaster request
   * @param rootAst - The parsed AST (since MapMasterInput doesn't contain it directly)
   * @returns Array of step candidates
   */
  buildCandidates(request: MapMasterInput, rootAst: ExpressionAstNode): MapMasterCandidate[];
}
