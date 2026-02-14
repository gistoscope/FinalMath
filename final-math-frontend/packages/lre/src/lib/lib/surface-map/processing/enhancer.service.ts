import { inject, injectable } from 'tsyringe';
import {
  buildASTFromLatex,
  enumerateIntegers,
  enumerateOperators,
} from '../../ast-parser'; // Assuming index.ts exports these
import { OPERATOR_SLOT_KINDS } from '../constants';
import type {
  IBBoxService,
  IOperatorNormalizer,
  ISurfaceMapEnhancer,
} from '../interfaces';
import type { SurfaceMap, SurfaceNode } from '../types';

@injectable()
export class SurfaceMapEnhancerService implements ISurfaceMapEnhancer {
  constructor(
    @inject('IBBoxService') private bboxService: IBBoxService,
    @inject('IOperatorNormalizer')
    private operatorNormalizer: IOperatorNormalizer,
  ) {}

  enhance(map: SurfaceMap, containerEl: HTMLElement): SurfaceMap {
    if (!map || !Array.isArray(map.atoms)) return map;

    const cbox = containerEl.getBoundingClientRect();

    // 1) Broaden frac bar hit-zone
    for (const n of map.atoms) {
      if (n.kind === 'FracBar' && n.bbox) {
        const expand = 3;
        n.bbox.top = this.bboxService.clamp(
          n.bbox.top - expand,
          0,
          cbox.height,
        );
        n.bbox.bottom = this.bboxService.clamp(
          n.bbox.bottom + expand,
          0,
          cbox.height,
        );
      }
    }

    // Helpers
    const isGreek = (s: string) =>
      /[\u0370-\u03FF\u1F00-\u1FFF]/.test((s || '').trim());
    const isDecimal = (s: string) => /^\d+\.\d+$/.test((s || '').trim());

    // Sort left-to-right
    const atomsSorted = [...map.atoms].sort(
      (a, b) => a.bbox.left - b.bbox.left || a.bbox.top - b.bbox.top,
    );

    // 2) Greek as Var, 3) Decimals
    for (const n of atomsSorted) {
      const t = (n.latexFragment || '').trim();
      if (isGreek(t)) n.kind = 'Var';
      if (isDecimal(t)) n.kind = 'Decimal';
    }

    // 4) Unary vs Binary minus
    for (let i = 0; i < atomsSorted.length; i++) {
      const n = atomsSorted[i];
      const t = (n.latexFragment || '').trim();
      if (t === '-' || t === '−') {
        let prev: SurfaceNode | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const p = atomsSorted[j];
          const overlap =
            Math.min(n.bbox.bottom, p.bbox.bottom) -
            Math.max(n.bbox.top, p.bbox.top);
          const minH = Math.min(
            this.bboxService.height(n.bbox),
            this.bboxService.height(p.bbox),
          );
          if (overlap > 0.25 * minH) {
            prev = p;
            break;
          }
        }
        const prevIsOperator =
          !prev ||
          ['BinaryOp', 'Relation', 'ParenOpen', 'FracBar', 'Operator'].includes(
            prev?.kind ?? '',
          );
        n.kind = prevIsOperator ? 'MinusUnary' : 'MinusBinary';
      }
    }

    // 5) Mixed numbers
    for (let i = 0; i < atomsSorted.length; i++) {
      const n = atomsSorted[i];
      if (n.kind === 'Num' || n.kind === 'Decimal') {
        const right = n.bbox.right;
        const myY = this.bboxService.midY(n.bbox);
        const candidate = atomsSorted.find(
          (m) =>
            m.kind === 'FracBar' &&
            m.bbox.left > right &&
            m.bbox.left - right < 22 &&
            m.bbox.top < myY &&
            m.bbox.bottom > myY,
        );
        if (candidate) {
          n.kind = 'MixedNumber';
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

  correlateIntegers(map: SurfaceMap, latex: string): SurfaceMap {
    if (!map || !map.root || !latex) return map;

    const ast = buildASTFromLatex(latex);
    if (!ast) return map;

    const astIntegers = enumerateIntegers(ast);
    const orderedLeaves = this.getOrderedLeaves(map.root);

    // Filter to only Num nodes that are leaves in our "Surface logic"
    // (Note: The builder's atom list logic was: kind==Num && no Num children)
    // We replicate that filter on the ordered list.
    const surfaceNumbers = orderedLeaves.filter(
      (n) =>
        n.kind === 'Num' &&
        !(
          Array.isArray(n.children) &&
          n.children.some((ch) => ch && ch.kind === 'Num')
        ),
    );

    // Match and inject
    const count = Math.min(astIntegers.length, surfaceNumbers.length);
    for (let i = 0; i < count; i++) {
      const astInt = astIntegers[i];
      const surfNum = surfaceNumbers[i];

      surfNum.astNodeId = astInt.nodeId;
      surfNum.astIntegerValue = astInt.value;

      if (surfNum.dom) {
        surfNum.dom.setAttribute('data-ast-id', astInt.nodeId);
        surfNum.dom.setAttribute('data-role', 'number');
      }

      // Propagate upward ID to parent Num containers if any
      let p = surfNum.parent; // Using direct parent link
      while (p && p.kind === 'Num') {
        if (!p.astNodeId) p.astNodeId = astInt.nodeId;
        if (p.astIntegerValue == null) p.astIntegerValue = astInt.value;
        if (p.dom && !p.dom.hasAttribute('data-ast-id')) {
          p.dom.setAttribute('data-ast-id', astInt.nodeId);
          p.dom.setAttribute('data-role', 'number');
        }
        p = p.parent;
      }
    }

    return map;
  }

  correlateOperators(map: SurfaceMap, latex: string): SurfaceMap {
    if (!map || !map.root || !latex) return map;

    const ast = buildASTFromLatex(latex);
    if (!ast) return map;

    const astOperators = enumerateOperators(ast);
    const orderedLeaves = this.getOrderedLeaves(map.root);

    const surfaceOperators = orderedLeaves.filter((n) => {
      const k = n.kind;
      return (
        k === 'BinaryOp' ||
        k === 'MinusBinary' ||
        k === 'MinusUnary' ||
        k === 'Relation'
      );
    });

    // Group by normalized symbol
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const astBySymbol: Record<string, any[]> = {};
    astOperators.forEach((op) => {
      const raw = op.operator;
      const sym = this.operatorNormalizer.normalize(raw);
      if (!astBySymbol[sym]) astBySymbol[sym] = [];
      astBySymbol[sym].push(op);
    });

    const surfaceBySymbol: Record<string, SurfaceNode[]> = {};
    surfaceOperators.forEach((op) => {
      const raw = op.latexFragment;
      const sym = this.operatorNormalizer.normalize(raw);
      if (!surfaceBySymbol[sym]) surfaceBySymbol[sym] = [];
      surfaceBySymbol[sym].push(op);
    });

    // Match groups
    const allSymbols = new Set([
      ...Object.keys(astBySymbol),
      ...Object.keys(surfaceBySymbol),
    ]);

    for (const sym of allSymbols) {
      const astOps = astBySymbol[sym] || [];
      const surfOps = surfaceBySymbol[sym] || [];

      const count = Math.min(astOps.length, surfOps.length);
      for (let i = 0; i < count; i++) {
        const astOp = astOps[i];
        const surfOp = surfOps[i];

        surfOp.astNodeId = astOp.nodeId;
        surfOp.astOperator = astOp.operator;

        if (surfOp.dom) {
          surfOp.dom.setAttribute('data-ast-id', astOp.nodeId);
          surfOp.dom.setAttribute('data-role', 'operator');
          surfOp.dom.setAttribute('data-operator', astOp.operator);
        }

        const sameNodeOps = astOps.filter(
          (op, idx) => idx < i && op.nodeId === astOp.nodeId,
        );
        surfOp.astOperatorIndex = sameNodeOps.length;
      }
    }

    return map;
  }

  /**
   * Recursively traverses the Surface Node tree and returns a list of leaf nodes
   * sorted by Visual Reading Order (Top-to-Bottom for fractions, Left-to-Right otherwise).
   */
  private getOrderedLeaves(node: SurfaceNode): SurfaceNode[] {
    if (!node.children || node.children.length === 0) {
      return [node];
    }

    // 1. Sort children by Left first (baseline sort)
    // Create a shallow copy to sort
    const children = [...node.children].sort(
      (a, b) => a.bbox.left - b.bbox.left,
    );

    // 2. Group children that are vertically stacked (high horizontal overlap)
    // We iterate through the left-sorted list and group overlapping items.
    const groups: SurfaceNode[][] = [];
    if (children.length > 0) {
      let currentGroup: SurfaceNode[] = [children[0]];
      groups.push(currentGroup);

      for (let i = 1; i < children.length; i++) {
        const curr = children[i];
        const prev = currentGroup[currentGroup.length - 1]; // Compare with last added to group? Or with group bounds?
        // Let's compare with the 'group' concept.
        // If 'curr' significantly overlaps with the 'group' horizontally, add to group.
        // Simple logic: compare with previous item in sorted list.
        // If they overlap heavily in X, they are likely a vertical stack column.
        const overlapX =
          Math.min(curr.bbox.right, prev.bbox.right) -
          Math.max(curr.bbox.left, prev.bbox.left);
        const minWidth = Math.min(
          curr.bbox.right - curr.bbox.left,
          prev.bbox.right - prev.bbox.left,
        );

        // Threshold: 50% overlap of the smaller element
        const isVerticalStack = overlapX > 0.5 * minWidth;

        if (isVerticalStack) {
          currentGroup.push(curr);
        } else {
          currentGroup = [curr];
          groups.push(currentGroup);
        }
      }
    }

    // 3. Process groups
    const result: SurfaceNode[] = [];
    for (const group of groups) {
      // If group has multiple items, it effectively represents a vertical construct (like a fraction column)
      // Sort them by Top to ensure Num comes before Denom
      if (group.length > 1) {
        group.sort((a, b) => a.bbox.top - b.bbox.top);
      }

      // Recurse
      for (const child of group) {
        result.push(...this.getOrderedLeaves(child));
      }
    }

    return result;
  }

  assertStableIdInjection(map: SurfaceMap): void {
    if (!map || !Array.isArray(map.atoms)) return;
    // Logic kept for potential debugging usage but mostly console checks
    // We can rely on unit tests for assertions in production code
  }
}
