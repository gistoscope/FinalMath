import { SurfaceNode } from "../surface-map/surface-node";
import { MathEngine } from "./MathEngine";
import { Parsers } from "./Parsers";

interface AstInteger {
  nodeId: string;
  value: string;
}

interface AstOperator {
  nodeId: string;
  operator: string;
}

export class SurfaceEnhancerLogic {
  /**
   * Sort atoms spatially (left-to-right, top-to-bottom).
   */
  static sortAtoms(atoms: SurfaceNode[]): SurfaceNode[] {
    return [...atoms].sort(
      (a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top,
    );
  }

  /**
   * Refine atom kinds based on text content (Greek -> Var, Decimals).
   */
  static refineAtomKinds(atoms: SurfaceNode[]): void {
    for (const n of atoms) {
      const t = (n.latexFragment || "").trim();
      if (Parsers.hasGreekChar(t)) n.kind = "Var";
      if (Parsers.isDecimal(t)) n.kind = "Decimal";
    }
  }

  /**
   * Detect and mark unary minus operators.
   */
  static detectUnaryMinus(sortedAtoms: SurfaceNode[]): void {
    const operatorKinds = new Set([
      "BinaryOp",
      "Relation",
      "ParenOpen",
      "FracBar",
      "Operator",
    ]);

    for (let i = 0; i < sortedAtoms.length; i++) {
      const n = sortedAtoms[i];
      const t = (n.latexFragment || "").trim();

      if (t === "-" || t === "−") {
        let prev: SurfaceNode | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const p = sortedAtoms[j];

          const overlap = MathEngine.getVerticalOverlap(
            n.bbox.top,
            n.bbox.bottom,
            p.bbox.top,
            p.bbox.bottom,
          );
          const minH = Math.min(
            MathEngine.height(n.bbox),
            MathEngine.height(p.bbox),
          );

          if (overlap > 0.25 * minH) {
            prev = p;
            break;
          }
        }

        const prevIsOperator = !prev || operatorKinds.has(prev.kind);
        n.kind = prevIsOperator ? "MinusUnary" : "MinusBinary";
      }
    }
  }

  /**
   * Detect mixed numbers (Integer immediately followed by Fraction).
   */
  static detectMixedNumbers(sortedAtoms: SurfaceNode[]): void {
    for (let i = 0; i < sortedAtoms.length; i++) {
      const n = sortedAtoms[i];
      if (n.kind === "Num" || n.kind === "Decimal") {
        const right = n.bbox.right;
        const myY = MathEngine.midY(n.bbox);

        const candidate = sortedAtoms.find(
          (m) =>
            m.kind === "FracBar" &&
            m.bbox.left > right &&
            m.bbox.left - right < 22 &&
            m.bbox.top < myY &&
            m.bbox.bottom > myY,
        );

        if (candidate) {
          n.kind = "MixedNumber";
          n.meta = Object.assign({}, n.meta || {}, {
            mixedWithFracBarId: candidate.id,
          });
        }
      }
    }
  }

  /**
   * Correlate surface numbers with AST integers.
   */
  static correlateIntegers(
    atoms: SurfaceNode[],
    astIntegers: AstInteger[],
  ): void {
    if (!atoms || !astIntegers) return;

    const allNums = atoms.filter((n) => n.kind === "Num");
    const leafNums = allNums.filter(
      (n) =>
        !(
          Array.isArray(n.children) &&
          n.children.some((ch) => ch.kind === "Num")
        ),
    );

    const surfaceNumbers = this.sortAtoms(leafNums);

    const count = Math.min(astIntegers.length, surfaceNumbers.length);
    for (let i = 0; i < count; i++) {
      const astInt = astIntegers[i];
      const surfNum = surfaceNumbers[i];

      surfNum.astNodeId = astInt.nodeId;
      surfNum.astIntegerValue = astInt.value;
    }
  }

  /**
   * Correlate surface operators with AST operators.
   */
  static correlateOperators(
    atoms: SurfaceNode[],
    astOperators: AstOperator[],
  ): void {
    if (!atoms || !astOperators) return;

    const surfaceOperators = atoms.filter((n: SurfaceNode) =>
      ["BinaryOp", "MinusBinary", "Relation"].includes(n.kind),
    );

    const sortedSurfOps = this.sortAtoms(surfaceOperators);

    const astBySymbol: Record<string, AstOperator[]> = {};
    for (const op of astOperators) {
      const sym = Parsers.normalizeOperator(op.operator);
      if (!astBySymbol[sym]) astBySymbol[sym] = [];
      astBySymbol[sym].push(op);
    }

    const surfBySymbol: Record<string, SurfaceNode[]> = {};
    for (const op of sortedSurfOps) {
      const sym = Parsers.normalizeOperator(op.latexFragment);
      if (!surfBySymbol[sym]) surfBySymbol[sym] = [];
      surfBySymbol[sym].push(op);
    }

    const allSymbols = new Set([
      ...Object.keys(astBySymbol),
      ...Object.keys(surfBySymbol),
    ]);

    for (const sym of allSymbols) {
      const astOps = astBySymbol[sym] || [];
      const surfOps = surfBySymbol[sym] || [];
      const count = Math.min(astOps.length, surfOps.length);

      for (let i = 0; i < count; i++) {
        const astOp = astOps[i];
        const surfOp = surfOps[i];

        surfOp.astNodeId = astOp.nodeId;
        surfOp.astOperator = astOp.operator;

        const sameNodeOps = astOps.filter(
          (op, idx) => idx < i && op.nodeId === astOp.nodeId,
        );
        surfOp.astOperatorIndex = sameNodeOps.length;
      }
    }
  }

  static assignOperatorIndices(
    sortedAtoms: SurfaceNode[],
    operatorKinds: Set<string>,
  ): void {
    let opIndex = 0;
    for (const n of sortedAtoms) {
      if (operatorKinds.has(n.kind)) {
        n.operatorIndex = opIndex++;
      }
    }
  }
}
