/**
 * SurfaceEnhancerLogic.js
 * Pure logic for determining node types and relationships based on geometry and content.
 * Relies on MathEngine for geometry and Parsers for text analysis.
 */

import { MathEngine } from "./MathEngine.js";
import { Parsers } from "./Parsers.js";

export class SurfaceEnhancerLogic {
  /**
   * Sort atoms spatially (left-to-right, top-to-bottom).
   * @param {Array} atoms
   * @returns {Array} Sorted atoms (shallow copy)
   */
  static sortAtoms(atoms) {
    return [...atoms].sort(
      (a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top,
    );
  }

  /**
   * Refine atom kinds based on text content (Greek -> Var, Decimals).
   * @param {Array} atoms
   */
  static refineAtomKinds(atoms) {
    for (const n of atoms) {
      const t = (n.latexFragment || "").trim();
      if (Parsers.hasGreekChar(t)) n.kind = "Var";
      if (Parsers.isDecimal(t)) n.kind = "Decimal";
    }
  }

  /**
   * Detect and mark unary minus operators.
   * A minus is unary if it follows an operator/relation/open-paren.
   * @param {Array} sortedAtoms - Must be sorted spatially
   */
  static detectUnaryMinus(sortedAtoms) {
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
        // Standard or minus sign
        let prev = null;
        // Look backward for the nearest spatially adjacent neighbor
        for (let j = i - 1; j >= 0; j--) {
          const p = sortedAtoms[j];

          // Check vertical overlap
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

          // If sufficient overlap, consider it a predecessor
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
   * @param {Array} sortedAtoms
   */
  static detectMixedNumbers(sortedAtoms) {
    for (let i = 0; i < sortedAtoms.length; i++) {
      const n = sortedAtoms[i];
      if (n.kind === "Num" || n.kind === "Decimal") {
        const right = n.bbox.right;
        const myY = MathEngine.midY(n.bbox);

        // Find a fraction bar to the immediate right
        const candidate = sortedAtoms.find(
          (m) =>
            m.kind === "FracBar" &&
            m.bbox.left > right &&
            m.bbox.left - right < 22 && // heuristic 22px
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
   * Modifies atoms in-place with astNodeId and astIntegerValue.
   * @param {Array} atoms - All surface atoms
   * @param {Array} astIntegers - From AST parser
   */
  static correlateIntegers(atoms, astIntegers) {
    if (!atoms || !astIntegers) return;

    // Filter leaf Num nodes
    const allNums = atoms.filter((n) => n.kind === "Num");
    const leafNums = allNums.filter(
      (n) =>
        !(
          Array.isArray(n.children) &&
          n.children.some((ch) => ch.kind === "Num")
        ),
    );

    // Sort spatially
    const surfaceNumbers = this.sortAtoms(leafNums);

    // Match
    const count = Math.min(astIntegers.length, surfaceNumbers.length);
    for (let i = 0; i < count; i++) {
      const astInt = astIntegers[i];
      const surfNum = surfaceNumbers[i];

      surfNum.astNodeId = astInt.nodeId;
      surfNum.astIntegerValue = astInt.value;

      // Note: Upward propagation and DOM injection logic belongs in the adapter
    }
  }

  /**
   * Correlate surface operators with AST operators.
   * Modifies atoms in-place with astNodeId.
   * @param {Array} atoms
   * @param {Array} astOperators - From AST parser
   */
  static correlateOperators(atoms, astOperators) {
    if (!atoms || !astOperators) return;

    const surfaceOperators = atoms.filter((n) =>
      ["BinaryOp", "MinusBinary", "Relation"].includes(n.kind),
    );

    const sortedSurfOps = this.sortAtoms(surfaceOperators);

    // Group keys by normalized symbol
    const astBySymbol = {};
    for (const op of astOperators) {
      const sym = Parsers.normalizeOperator(op.operator);
      if (!astBySymbol[sym]) astBySymbol[sym] = [];
      astBySymbol[sym].push(op);
    }

    const surfBySymbol = {};
    for (const op of sortedSurfOps) {
      const sym = Parsers.normalizeOperator(op.latexFragment);
      if (!surfBySymbol[sym]) surfBySymbol[sym] = [];
      surfBySymbol[sym].push(op);
    }

    // Match
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

        // Calculate local index
        const sameNodeOps = astOps.filter(
          (op, idx) => idx < i && op.nodeId === astOp.nodeId,
        );
        surfOp.astOperatorIndex = sameNodeOps.length;
      }
    }
  }
  static assignOperatorIndices(sortedAtoms, operatorKinds) {
    let opIndex = 0;
    for (const n of sortedAtoms) {
      if (operatorKinds.has(n.kind)) {
        n.operatorIndex = opIndex++;
      }
    }
  }
}
