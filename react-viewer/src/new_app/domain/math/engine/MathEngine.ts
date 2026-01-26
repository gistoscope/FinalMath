import { inject, singleton } from "tsyringe";
import { Tokens } from "../../../di/tokens";
import {
  LatexInstrumenter,
  type InstrumentationResult,
} from "../instrumentation/LatexInstrumenter";
import type { AugmentedAstNode } from "../models/AstNode";
import { AstTraverser } from "../parser/AstTraverser";
import type { IParser } from "../parser/IParser";

/**
 * MathEngine service - Orchestrator for math domain logic.
 */
@singleton()
export class MathEngine {
  private parser: IParser;
  private traverser: AstTraverser;
  private instrumenter: LatexInstrumenter;

  constructor(
    @inject(Tokens.IMathParser) parser: IParser,
    traverser: AstTraverser,
    instrumenter: LatexInstrumenter,
  ) {
    this.parser = parser;
    this.traverser = traverser;
    this.instrumenter = instrumenter;
  }

  /**
   * Parse LaTeX and augment it with IDs.
   */
  public buildAugmentedAst(latex: string): AugmentedAstNode | null {
    const rawAst = this.parser.parse(latex);
    if (!rawAst) return null;
    return this.traverser.augmentWithIds(rawAst);
  }

  /**
   * Convert LaTeX to instrumented version for the viewer.
   */
  public instrumentLatex(latex: string): InstrumentationResult {
    const ast = this.buildAugmentedAst(latex);

    if (!ast) {
      return {
        success: false,
        latex: latex,
        reason: "Failed to parse expression",
      };
    }

    const instrumented = this.instrumenter.toInstrumentedLatex(ast);

    if (!instrumented) {
      return {
        success: false,
        latex: latex,
        reason: "Failed to serialize instrumented AST",
      };
    }

    return {
      success: true,
      latex: instrumented,
    };
  }

  /**
   * Convert an existing augmented AST to instrumented LaTeX.
   */
  public instrumentFromAst(
    ast: AugmentedAstNode | null,
  ): InstrumentationResult {
    if (!ast) {
      return { success: false, latex: "", reason: "No AST provided" };
    }

    const instrumented = this.instrumenter.toInstrumentedLatex(ast);

    return {
      success: !!instrumented,
      latex: instrumented || "",
      reason: instrumented ? undefined : "Instrumentation failed",
    };
  }
}
