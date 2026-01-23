/**
 * @fileoverview Surface map enhancement functions
 * Post-processing to refine classification and add AST correlation.
 */

import { SurfaceEnhancerLogic } from "../../modules/SurfaceEnhancerLogic.js";
import {
  buildASTFromLatex,
  enumerateIntegers,
  enumerateOperators,
} from "../ast-parser.js";
import { BBoxUtils } from "./bbox-utils.js"; // Keeping for clamp/dom usage
import { INTERACTIVE_KINDS, OPERATOR_SLOT_KINDS } from "./constants.js";

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

    // 1) Broaden frac bar hit-zone (DOM dependent constraint)
    for (const n of map.atoms) {
      if (n.kind === "FracBar" && n.bbox) {
        const expand = 3;
        n.bbox.top = BBoxUtils.clamp(n.bbox.top - expand, 0, cbox.height);
        n.bbox.bottom = BBoxUtils.clamp(n.bbox.bottom + expand, 0, cbox.height);
      }
    }

    // Sort left-to-right (Logic)
    const atomsSorted = SurfaceEnhancerLogic.sortAtoms(map.atoms);

    // 2 & 3) Greek & Decimals (Logic)
    SurfaceEnhancerLogic.refineAtomKinds(atomsSorted);

    // 4) Unary vs Binary minus (Logic)
    SurfaceEnhancerLogic.detectUnaryMinus(atomsSorted);

    // 5) Mixed numbers (Logic)
    SurfaceEnhancerLogic.detectMixedNumbers(atomsSorted);

    // 6) Assign operator indices (Logic)
    SurfaceEnhancerLogic.assignOperatorIndices(
      atomsSorted,
      OPERATOR_SLOT_KINDS,
    );

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

    // PURE LOGIC MATCHING
    SurfaceEnhancerLogic.correlateIntegers(map.atoms, astIntegers);

    // DOM INJECTION (Side effect)
    this._injectDomAttributes(map.atoms);

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

    // PURE LOGIC MATCHING
    SurfaceEnhancerLogic.correlateOperators(map.atoms, astOperators);

    // DOM INJECTION
    this._injectDomAttributes(map.atoms);

    return map;
  }

  /**
   * Helper to apply AST attributes to DOM.
   * @param {Array} atoms
   */
  static _injectDomAttributes(atoms) {
    // We also need to propagate AST IDs up to parent Num nodes if children matched
    // Build parent map first (or reusing logic from SurfaceEnhancerLogic if we extracted it, but propagation is tree traversal)
    // The original code did propagation for Integers. Let's replicate simple attribute injection first.

    // Simplest: just iterate atoms. If they have astNodeId, set attribute.
    // AND handles parents.

    const parentByChild = new Map();
    for (const n of atoms) {
      if (!n || !Array.isArray(n.children)) continue;
      for (const ch of n.children) parentByChild.set(ch, n);
    }

    // Inject attributes
    for (const n of atoms) {
      if (n.astNodeId && n.dom) {
        n.dom.setAttribute("data-ast-id", n.astNodeId);
        // Special roles
        if (n.kind === "Num" || n.kind === "Number")
          n.dom.setAttribute("data-role", "number");
        if (n.astOperator) {
          n.dom.setAttribute("data-role", "operator");
          n.dom.setAttribute("data-operator", n.astOperator);
        }
      }
    }

    // Integer Propagation: if a child has astNodeId, parent Num should inherit it.
    // We can do this bottom-up or just check parents.
    // The original code handled this inside the loop.
    // Let's do a pass for Num parents.
    for (const n of atoms) {
      if (n.kind === "Num" && n.children && n.children.length > 0) {
        // check children
        const matchedChild = n.children.find((c) => c.astNodeId);
        if (matchedChild) {
          n.astNodeId = matchedChild.astNodeId;
          n.astIntegerValue = matchedChild.astIntegerValue;
          if (n.dom) {
            n.dom.setAttribute("data-ast-id", n.astNodeId);
            n.dom.setAttribute("data-role", "number");
          }
        }
      }
    }
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
      // Logging logic
      console.error(`[STABLE-ID] Missing IDs: ${missing.length}`);
    } else {
      const count = map.atoms.filter(
        (a) => a.dom && INTERACTIVE_KINDS.has(a.kind),
      ).length;
      console.log(`[STABLE-ID] All ${count} OK.`);
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
