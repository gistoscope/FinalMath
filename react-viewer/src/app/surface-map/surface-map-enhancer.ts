/**
 * @fileoverview Surface map enhancement functions
 */

import {
  buildASTFromLatex,
  enumerateIntegers,
  enumerateOperators,
} from "../ast-parser";
import { SurfaceEnhancerLogic } from "../modules/SurfaceEnhancerLogic";
import { BBoxUtils } from "./bbox-utils";
import { INTERACTIVE_KINDS, OPERATOR_SLOT_KINDS } from "./constants";
import { SurfaceNode } from "./surface-node";

/**
 * Class for enhancing surface maps with additional classification and correlation.
 */
export class SurfaceMapEnhancer {
  /**
   * Post-process the surface map to refine classification and assign indices.
   */
  static enhance(
    map: { atoms: SurfaceNode[] },
    containerEl: HTMLElement,
  ): { atoms: SurfaceNode[] } {
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

    const atomsSorted = SurfaceEnhancerLogic.sortAtoms(map.atoms);

    SurfaceEnhancerLogic.refineAtomKinds(atomsSorted);
    SurfaceEnhancerLogic.detectUnaryMinus(atomsSorted);
    SurfaceEnhancerLogic.detectMixedNumbers(atomsSorted);
    SurfaceEnhancerLogic.assignOperatorIndices(
      atomsSorted,
      OPERATOR_SLOT_KINDS,
    );

    return map;
  }

  /**
   * Correlate surface map numbers with AST integer node IDs.
   */
  static correlateIntegers(
    map: { atoms: SurfaceNode[] },
    latex: string,
  ): { atoms: SurfaceNode[] } {
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
    SurfaceEnhancerLogic.correlateIntegers(map.atoms, astIntegers);
    this._injectDomAttributes(map.atoms);

    return map;
  }

  /**
   * Correlate surface map operators with AST node IDs.
   */
  static correlateOperators(
    map: { atoms: SurfaceNode[] },
    latex: string,
  ): { atoms: SurfaceNode[] } {
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
    SurfaceEnhancerLogic.correlateOperators(map.atoms, astOperators);
    this._injectDomAttributes(map.atoms);

    return map;
  }

  /**
   * Helper to apply AST attributes to DOM.
   */
  private static _injectDomAttributes(atoms: SurfaceNode[]) {
    for (const n of atoms) {
      if (n.astNodeId && n.dom) {
        n.dom.setAttribute("data-ast-id", n.astNodeId);
        if (n.kind === "Num" || n.kind === "Number")
          n.dom.setAttribute("data-role", "number");
        if (n.astOperator) {
          n.dom.setAttribute("data-role", "operator");
          n.dom.setAttribute("data-operator", n.astOperator);
        }
      }
    }

    // Integer Propagation
    for (const n of atoms) {
      if (n.kind === "Num" && n.children && n.children.length > 0) {
        const matchedChild = n.children.find((c) => c.astNodeId);
        if (matchedChild) {
          n.astNodeId = matchedChild.astNodeId;
          n.astIntegerValue = matchedChild.astIntegerValue;
          if (n.dom) {
            n.dom.setAttribute("data-ast-id", n.astNodeId || "");
            n.dom.setAttribute("data-role", "number");
          }
        }
      }
    }
  }

  /**
   * Assert that all interactive elements have data-ast-id.
   */
  static assertStableIdInjection(map: { atoms: SurfaceNode[] }) {
    if (!map || !Array.isArray(map.atoms)) return;
    const missing: any[] = [];
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
      console.error(`[STABLE-ID] Missing IDs: ${missing.length}`);
    } else {
      const count = map.atoms.filter(
        (a) => a.dom && INTERACTIVE_KINDS.has(a.kind),
      ).length;
      console.log(`[STABLE-ID] All ${count} OK.`);
    }
  }
}

export function enhanceSurfaceMap(
  map: { atoms: SurfaceNode[] },
  containerEl: HTMLElement,
) {
  return SurfaceMapEnhancer.enhance(map, containerEl);
}

export function correlateIntegersWithAST(
  map: { atoms: SurfaceNode[] },
  latex: string,
) {
  return SurfaceMapEnhancer.correlateIntegers(map, latex);
}

export function correlateOperatorsWithAST(
  map: { atoms: SurfaceNode[] },
  latex: string,
) {
  return SurfaceMapEnhancer.correlateOperators(map, latex);
}

export function assertStableIdInjection(map: { atoms: SurfaceNode[] }) {
  return SurfaceMapEnhancer.assertStableIdInjection(map);
}
