import { inject, singleton } from "tsyringe";
import { IntrospectClient } from "../../../core/api/clients/IntrospectClient";
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
  private backendClient: IntrospectClient;

  constructor(
    @inject(Tokens.IMathParser) parser: IParser,
    @inject(AstTraverser) traverser: AstTraverser,
    @inject(LatexInstrumenter) instrumenter: LatexInstrumenter,
    @inject(IntrospectClient) backendClient: IntrospectClient,
  ) {
    this.parser = parser;
    this.traverser = traverser;
    this.instrumenter = instrumenter;
    this.backendClient = backendClient;
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
  public async instrumentLatex(latex: string): Promise<InstrumentationResult> {
    const ast = this.buildAugmentedAst(latex);

    if (!ast) {
      console.log("[MathEngine] Local parse failed, trying backend...");
      try {
        const backendResult = await this.backendClient.instrumentLatex(latex);
        return {
          success: backendResult.success,
          latex: backendResult.latex || latex,
          reason: backendResult.reason,
        };
      } catch {
        return {
          success: false,
          latex: latex,
          reason: "Backend instrumentation failed",
        };
      }
    }

    const instrumented = this.instrumenter.toInstrumentedLatex(ast);
    return {
      success: !!instrumented,
      latex: instrumented || latex,
      reason: instrumented ? undefined : "Instrumentation failed",
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
