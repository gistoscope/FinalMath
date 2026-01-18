/**
 * @fileoverview Surface map enhancement functions
 * Post-processing to refine classification and add AST correlation.
 */

import {
  buildASTFromLatex,
  enumerateIntegers,
  enumerateOperators,
} from "../ast-parser.js";
import { BBoxUtils } from "./bbox-utils.js";
import { INTERACTIVE_KINDS, OPERATOR_SLOT_KINDS } from "./constants.js";
import { OperatorNormalizer } from "./operator-normalizer.js";

/**
 * Class for enhancing surface maps with additional classification and correlation.
 */
export class SurfaceMapEnhancer {
  /**
   * Post-process the surface map to:
   * 1. Broaden FracBar hit area
   * 2. Tag Greek letters as Var
   * 3. Detect decimals
   * 4. Distinguish unary vs binary minus
   * 5. Mark mixed numbers
   * 6. Assign operator indices
   *
   * @param {Object} map - Surface map
   * @param {HTMLElement} containerEl - Container element
   * @returns {Object} Enhanced map
   */
  static enhance(map, containerEl) {
    if (!map || !Array.isArray(map.atoms)) return map;

    const cbox = containerEl.getBoundingClientRect();

    // 1) Broaden frac bar hit-zone
    for (const n of map.atoms) {
      if (n.kind === "FracBar" && n.bbox) {
        const expand = 3;
        n.bbox.top = BBoxUtils.clamp(n.bbox.top - expand, 0, cbox.height);
        n.bbox.bottom = BBoxUtils.clamp(n.bbox.bottom + expand, 0, cbox.height);
      }
    }

    // Helpers
    const isGreek = (s) =>
      /[\u0370-\u03FF\u1F00-\u1FFF]/.test((s || "").trim());
    const isDecimal = (s) => /^\d+\.\d+$/.test((s || "").trim());

    // Sort left-to-right
    const atomsSorted = [...map.atoms].sort(
      (a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top,
    );

    // 2) Greek as Var, 3) Decimals
    for (const n of atomsSorted) {
      const t = (n.latexFragment || "").trim();
      if (isGreek(t)) n.kind = "Var";
      if (isDecimal(t)) n.kind = "Decimal";
    }

    // 4) Unary vs Binary minus
    for (let i = 0; i < atomsSorted.length; i++) {
      const n = atomsSorted[i];
      const t = (n.latexFragment || "").trim();
      if (t === "-" || t === "−") {
        let prev = null;
        for (let j = i - 1; j >= 0; j--) {
          const p = atomsSorted[j];
          const overlap =
            Math.min(n.bbox.bottom, p.bbox.bottom) -
            Math.max(n.bbox.top, p.bbox.top);
          const minH = Math.min(
            BBoxUtils.height(n.bbox),
            BBoxUtils.height(p.bbox),
          );
          if (overlap > 0.25 * minH) {
            prev = p;
            break;
          }
        }
        const prevIsOperator =
          !prev ||
          ["BinaryOp", "Relation", "ParenOpen", "FracBar", "Operator"].includes(
            prev?.kind,
          );
        n.kind = prevIsOperator ? "MinusUnary" : "MinusBinary";
      }
    }

    // 5) Mixed numbers
    for (let i = 0; i < atomsSorted.length; i++) {
      const n = atomsSorted[i];
      if (n.kind === "Num" || n.kind === "Decimal") {
        const right = n.bbox.right;
        const myY = BBoxUtils.midY(n.bbox);
        const candidate = atomsSorted.find(
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

    // 6) Assign operator indices
    let opIndex = 0;
    for (const n of atomsSorted) {
      if (OPERATOR_SLOT_KINDS.has(n.kind)) {
        n.operatorIndex = opIndex++;
      }
    }

    return map;
  }

  /**
   * Correlate surface map numbers with AST integer node IDs.
   * @param {Object} map - Surface map
   * @param {string} latex - LaTeX expression
   * @returns {Object} Enhanced map
   */
  static correlateIntegers(map, latex) {
    if (!map || !Array.isArray(map.atoms) || !latex) return map;

    const ast = buildASTFromLatex(latex);
    if (!ast) {
      console.warn(
        "[SurfaceMap] Failed to parse LaTeX for integer correlation:",
        latex,
      );
      return map;
    }

    const astIntegers = enumerateIntegers(ast);

    // Build parent map
    const parentByChild = new Map();
    for (const n of map.atoms) {
      if (!n || !Array.isArray(n.children)) continue;
      for (const ch of n.children) parentByChild.set(ch, n);
    }

    // Get leaf Num nodes
    const allNums = map.atoms.filter((n) => n && n.kind === "Num");
    const leafNums = allNums.filter(
      (n) =>
        !(
          Array.isArray(n.children) &&
          n.children.some((ch) => ch && ch.kind === "Num")
        ),
    );

    const surfaceNumbers = leafNums.sort(
      (a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top,
    );

    console.log("=== [SURFACE-NUMS] Integer correlation ===");
    console.log(`[SURFACE-NUMS] Expression: "${latex}"`);
    console.log(
      `[SURFACE-NUMS] AST integers: ${astIntegers.length}, Surface nums: ${surfaceNumbers.length}`,
    );

    // Debug logging
    console.log("[AST-NUMS] All AST integers:");
    astIntegers.forEach((ai, idx) => {
      console.log(
        `  [AST-NUMS] [${idx}] nodeId="${ai.nodeId}" value=${ai.value}`,
      );
    });

    console.log("[SURFACE-NUMS] All surface numbers:");
    surfaceNumbers.forEach((sn, idx) => {
      console.log(
        `  [SURFACE-NUMS] [${idx}] surfaceId="${sn.id}" text="${sn.text || sn.latexFragment}" kind=${sn.kind} bbox=(${Math.round(sn.bbox.left)},${Math.round(sn.bbox.top)})`,
      );
    });

    // Match and inject
    const count = Math.min(astIntegers.length, surfaceNumbers.length);
    for (let i = 0; i < count; i++) {
      const astInt = astIntegers[i];
      const surfNum = surfaceNumbers[i];

      surfNum.astNodeId = astInt.nodeId;
      surfNum.astIntegerValue = astInt.value;

      if (surfNum.dom) {
        surfNum.dom.setAttribute("data-ast-id", astInt.nodeId);
        surfNum.dom.setAttribute("data-role", "number");
      }

      // Propagate upward
      let p = parentByChild.get(surfNum);
      while (p && p.kind === "Num") {
        if (!p.astNodeId) p.astNodeId = astInt.nodeId;
        if (p.astIntegerValue == null) p.astIntegerValue = astInt.value;
        if (p.dom && !p.dom.hasAttribute("data-ast-id")) {
          p.dom.setAttribute("data-ast-id", astInt.nodeId);
          p.dom.setAttribute("data-role", "number");
        }
        p = parentByChild.get(p);
      }

      console.log(
        `[SURFACE-NUMS] MATCHED: surface[${i}] "${surfNum.text || surfNum.latexFragment}" (id=${surfNum.id}) -> AST nodeId="${astInt.nodeId}" value=${astInt.value} [DOM injected]`,
      );
    }

    return map;
  }

  /**
   * Correlate surface map operators with AST node IDs.
   * @param {Object} map - Surface map
   * @param {string} latex - LaTeX expression
   * @returns {Object} Enhanced map
   */
  static correlateOperators(map, latex) {
    if (!map || !Array.isArray(map.atoms) || !latex) return map;

    const ast = buildASTFromLatex(latex);
    if (!ast) {
      console.warn(
        "[SurfaceMap] Failed to parse LaTeX for AST correlation:",
        latex,
      );
      return map;
    }

    const astOperators = enumerateOperators(ast);

    const surfaceOperators = map.atoms
      .filter((n) => {
        const k = n.kind;
        return k === "BinaryOp" || k === "MinusBinary" || k === "Relation";
      })
      .sort((a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top);

    // Debug logging
    console.log("=== [AST-OPS] Operator sequence from AST ===");
    astOperators.forEach((op, idx) => {
      console.log(
        `[AST-OPS] index=${idx} op="${op.operator}" nodeId="${op.nodeId}" position=${op.position}`,
      );
    });

    console.log(
      "=== [SURFACE-OPS] Operator sequence from Surface Map (before correlation) ===",
    );
    surfaceOperators.forEach((op, idx) => {
      console.log(
        `[SURFACE-OPS] index=${idx} op="${op.latexFragment}" surfaceId="${op.id}" bbox.left=${Math.round(op.bbox.left)} operatorIndex=${op.operatorIndex} astNodeId=${op.astNodeId || "NOT_SET"}`,
      );
    });

    // Group by normalized symbol
    const astBySymbol = {};
    astOperators.forEach((op) => {
      const raw = op.operator;
      const sym = OperatorNormalizer.normalize(raw);
      console.log(
        `[DEBUG-NORM] AST: raw="${raw}" (U+${raw.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}) => normalized="${sym}"`,
      );
      if (!astBySymbol[sym]) astBySymbol[sym] = [];
      astBySymbol[sym].push(op);
    });

    const surfaceBySymbol = {};
    surfaceOperators.forEach((op) => {
      const raw = op.latexFragment;
      const sym = OperatorNormalizer.normalize(raw);
      console.log(
        `[DEBUG-NORM] Surface: raw="${raw}" (U+${raw.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}) => normalized="${sym}"`,
      );
      if (!surfaceBySymbol[sym]) surfaceBySymbol[sym] = [];
      surfaceBySymbol[sym].push(op);
    });

    // Match groups
    console.log("=== [SURFACE-OPS] Correlating surface operators with AST ===");
    const allSymbols = new Set([
      ...Object.keys(astBySymbol),
      ...Object.keys(surfaceBySymbol),
    ]);

    for (const sym of allSymbols) {
      const astOps = astBySymbol[sym] || [];
      const surfOps = surfaceBySymbol[sym] || [];

      console.log(
        `[SURFACE-OPS] Matching symbol "${sym}": ${astOps.length} AST ops, ${surfOps.length} surface ops`,
      );

      const count = Math.min(astOps.length, surfOps.length);
      for (let i = 0; i < count; i++) {
        const astOp = astOps[i];
        const surfOp = surfOps[i];

        surfOp.astNodeId = astOp.nodeId;
        surfOp.astOperator = astOp.operator;

        if (surfOp.dom) {
          surfOp.dom.setAttribute("data-ast-id", astOp.nodeId);
          surfOp.dom.setAttribute("data-role", "operator");
          surfOp.dom.setAttribute("data-operator", astOp.operator);
        }

        const sameNodeOps = astOps.filter(
          (op, idx) => idx < i && op.nodeId === astOp.nodeId,
        );
        surfOp.astOperatorIndex = sameNodeOps.length;

        console.log(
          `[SURFACE-OPS]   Matched: surface[${i}] "${surfOp.latexFragment}" (${surfOp.id}) -> AST nodeId="${astOp.nodeId}" localIndex=${surfOp.astOperatorIndex} [DOM injected]`,
        );
      }
    }

    // Final logging
    console.log(
      "=== [SURFACE-OPS] Final operator sequence (after correlation) ===",
    );
    surfaceOperators.forEach((op, idx) => {
      const astLocal =
        typeof op.astOperatorIndex === "number" ? op.astOperatorIndex : "?";
      console.log(
        `[SURFACE-OPS] index=${idx} op="${op.latexFragment}" surfaceId="${op.id}" astNodeId="${op.astNodeId || "UNMATCHED"}" astLocalIndex=${astLocal} globalIndex=${op.operatorIndex}`,
      );
    });

    return map;
  }

  /**
   * Assert that all interactive elements have data-ast-id.
   * @param {Object} map - Surface map
   */
  static assertStableIdInjection(map) {
    if (!map || !Array.isArray(map.atoms)) return;

    const missing = [];

    for (const atom of map.atoms) {
      if (!atom.dom) continue;

      const kind = atom.kind || "";
      const isInteractive = INTERACTIVE_KINDS.has(kind);

      if (isInteractive && !atom.dom.hasAttribute("data-ast-id")) {
        missing.push({
          id: atom.id,
          kind: atom.kind,
          text: atom.latexFragment || atom.dom.textContent,
        });
      }
    }

    if (missing.length > 0) {
      const first3 = missing
        .slice(0, 3)
        .map((m) => `${m.kind}:"${m.text}" (${m.id})`)
        .join(", ");
      console.error(
        `[STABLE-ID ASSERTION] ${missing.length} interactive element(s) missing data-ast-id: ${first3}${missing.length > 3 ? "..." : ""}`,
      );
    } else {
      const interactiveCount = map.atoms.filter(
        (a) => a.dom && INTERACTIVE_KINDS.has(a.kind),
      ).length;
      console.log(
        `[STABLE-ID ASSERTION] All ${interactiveCount} interactive elements have data-ast-id`,
      );
    }
  }
}

// Export standalone functions for backward compatibility
export function enhanceSurfaceMap(map, containerEl) {
  return SurfaceMapEnhancer.enhance(map, containerEl);
}

export function correlateIntegersWithAST(map, latex) {
  return SurfaceMapEnhancer.correlateIntegers(map, latex);
}

export function correlateOperatorsWithAST(map, latex) {
  return SurfaceMapEnhancer.correlateOperators(map, latex);
}

export function assertStableIdInjection(map) {
  return SurfaceMapEnhancer.assertStableIdInjection(map);
}
