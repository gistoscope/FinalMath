/**
 * Debug Info Builder
 *
 * Utility class for building debug information objects
 * used in orchestrator responses.
 */

import { injectable } from "tsyringe";

/**
 * DebugInfoBuilder - Constructs debug information for various scenarios
 */
@injectable()
export class DebugInfoBuilder {
  /**
   * Build debug info for integer click detection
   */
  buildIntegerClickDebug(params: {
    clickedNodePath: string;
    targetNodeId: string;
    integerValue: any;
    detectedByAst: boolean;
    detectedBySurface: boolean;
  }): Record<string, any> {
    return {
      clickedNodeType: "integer",
      clickedNodePath: params.clickedNodePath,
      targetNodeId: params.targetNodeId,
      integerValue: params.integerValue,
      detectedByAst: params.detectedByAst,
      detectedBySurface: params.detectedBySurface,
    };
  }

  /**
   * Build debug info for V5 outcome handling
   */
  buildV5OutcomeDebug(params: {
    v5Status: string;
    message?: string;
    options?: any[];
    preferredPrimitiveId?: string;
    availableMatches?: string[];
  }): Record<string, any> {
    const debug: Record<string, any> = {
      v5Status: params.v5Status,
    };

    if (params.message) debug.message = params.message;
    if (params.options) debug.options = params.options;
    if (params.preferredPrimitiveId) debug.preferredPrimitiveId = params.preferredPrimitiveId;
    if (params.availableMatches) debug.availableMatches = params.availableMatches;

    return debug;
  }

  /**
   * Build debug info for candidate selection
   */
  buildCandidateDebug(params: {
    chosenCandidateId?: string | null | undefined;
    allCandidates: any[];
    isPrimitiveMasterPath?: boolean;
    pmPrimitiveId?: string | null | undefined;
  }): Record<string, any> {
    const debug: Record<string, any> = {
      allCandidates: params.allCandidates,
    };

    if (params.chosenCandidateId) debug.chosenCandidateId = params.chosenCandidateId;
    if (params.isPrimitiveMasterPath !== undefined)
      debug.isPrimitiveMasterPath = params.isPrimitiveMasterPath;
    if (params.pmPrimitiveId !== undefined) debug.pmPrimitiveId = params.pmPrimitiveId;

    return debug;
  }

  /**
   * Build debug info for primitive execution
   */
  buildPrimitiveDebug(params: {
    primitiveId: string;
    status: "ready" | "error";
    domain: string;
    reason: string;
  }): {
    primitiveId: string;
    status: string;
    domain: string;
    reason: string;
  } {
    return {
      primitiveId: params.primitiveId,
      status: params.status,
      domain: params.domain,
      reason: params.reason,
    };
  }
}
