/**
 * MapMaster Class
 *
 * Generates step candidates based on expression state and invariant rules.
 *
 * Responsibilities:
 *  - Parse expression into AST
 *  - Normalize selection
 *  - Match invariant rules to expression patterns
 *  - Generate candidate list
 */

import { container, injectable } from "tsyringe";
import { AstParser } from "../ast/parser.ast.js";
import type { MapMasterInput, MapMasterResult } from "./mapmaster.types.js";
import { MapMasterRuleProvider } from "./providers/rules/rule.provider.js";
import { MapMasterSelectionNormalizer } from "./providers/selection-normalizer";

export interface MapMasterConfig {
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

/**
 * MapMaster - Generates step candidates
 */
@injectable()
export class MapMaster {
  constructor(
    private readonly ruleProvider: MapMasterRuleProvider,
    private readonly ast: AstParser,
    private readonly selectionNormalizer: MapMasterSelectionNormalizer
  ) {}

  generate(input: MapMasterInput): MapMasterResult {
    const { expressionLatex, registry } = input;

    // 1. Parse expression using robust AST parser
    const ast = this.ast.parseExpression(expressionLatex);
    if (!ast) return { candidates: [] };

    const normalized = this.selectionNormalizer.normalizeSelection(input, ast);
    const resolvedSelectionPath = normalized ? normalized.anchorPath.join(".") : undefined;

    const candidates = this.ruleProvider.buildCandidates(input, ast);

    return { candidates, resolvedSelectionPath };
  }
}

/**
 * Factory function for MapMaster (backward compatibility)
 */
export function createMapMaster(): MapMaster {
  return container.resolve(MapMaster);
}

/**
 * Standalone function for backward compatibility
 */
export function mapMasterGenerate(input: MapMasterInput): MapMasterResult {
  const mapMaster = createMapMaster();
  return mapMaster.generate(input);
}
