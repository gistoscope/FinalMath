// core/stable-id.ts
// Stable-ID utilities for DOM scanning and AST correlation

/**
 * STABLE-ID: Get astId from DOM element's data-ast-id attribute.
 * This is the authoritative source for click/hover targeting.
 */
export function getAstIdFromDOM(domElement: Element | null): string | null {
  if (!domElement) return null;

  // Try the element itself first
  if (domElement.hasAttribute && domElement.hasAttribute("data-ast-id")) {
    return domElement.getAttribute("data-ast-id");
  }

  // Use closest to find parent with data-ast-id
  const withAstId = domElement.closest
    ? domElement.closest("[data-ast-id]")
    : null;
  if (withAstId) {
    return withAstId.getAttribute("data-ast-id");
  }

  return null;
}

/**
 * STABLE-ID: Get role and operator info from DOM element.
 */
export function getRoleFromDOM(domElement: Element | null): {
  role: string | null;
  operator: string | null;
} {
  if (!domElement) return { role: null, operator: null };

  const withRole = domElement.closest
    ? domElement.closest("[data-role]")
    : null;
  if (withRole) {
    return {
      role: withRole.getAttribute("data-role"),
      operator: withRole.getAttribute("data-operator") || null,
    };
  }

  return { role: null, operator: null };
}

/**
 * STABLE-ID: Scan DOM for elements with data-ast-id and populate surface map atoms.
 */
export function scanDOMForStableIds(
  map: any,
  container: HTMLElement,
): Map<string, any> | void {
  if (!map || !Array.isArray(map.atoms) || !container) return;

  const katexHtml = container.querySelector(".katex-html");
  if (!katexHtml) {
    console.warn("[STABLE-ID] No .katex-html found in container");
    return;
  }

  const stableElements = katexHtml.querySelectorAll("[data-ast-id]");
  const stableTokenMap = new Map<string, any>();

  for (const el of stableElements) {
    const astId = el.getAttribute("data-ast-id") || "";
    const role = el.getAttribute("data-role") || "";
    const operator = el.getAttribute("data-operator") || "";
    const stableKey = `${astId}|${role}|${operator}`;

    if (!stableTokenMap.has(stableKey)) {
      stableTokenMap.set(stableKey, {
        astId,
        role,
        operator,
        dom: el,
        stableKey,
      });
    }
  }

  const astIdByDom = new Map<Element, any>();
  for (const [, info] of stableTokenMap) {
    astIdByDom.set(info.dom, info);
  }

  for (const atom of map.atoms) {
    if (!atom.dom) continue;
    if (!katexHtml.contains(atom.dom)) continue;

    let current: HTMLElement | null = atom.dom;
    while (current && current !== container) {
      if (astIdByDom.has(current)) {
        const info = astIdByDom.get(current);
        atom.astNodeId = info.astId;
        atom.dataRole = info.role;
        atom.dataOperator = info.operator;
        atom.stableKey = info.stableKey;
        break;
      }
      current = current.parentElement;
    }
  }

  return stableTokenMap;
}

export function assertDOMStableIds(_container: HTMLElement) {}

/**
 * STEP 2: Detect if clicked integer is a multiplier "1" that participates in diff-denom flow.
 */
export function detectStep2MultiplierContext(
  _surfaceNodeId: string,
  astNodeId: string | null,
  _surfaceMap: any,
  currentLatex: string,
): {
  isStep2Context: boolean;
  side?: string;
  path?: string;
  oppositeDenom?: string;
} {
  if (!astNodeId) {
    return { isStep2Context: false };
  }

  const leftPattern = /^term\[0\]\.term\[1\]$/;
  const rightPattern = /^term\[1\]\.term\[1\]$/;

  let side: string | null = null;
  if (leftPattern.test(astNodeId)) {
    side = "left";
  } else if (rightPattern.test(astNodeId)) {
    side = "right";
  } else {
    return { isStep2Context: false };
  }

  const latex = typeof currentLatex === "string" ? currentLatex : "";

  const fullPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  const leftAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  const rightAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}/;

  let leftDenom: string | null = null;
  let rightDenom: string | null = null;

  const fullMatch = latex.match(fullPattern);
  if (fullMatch) {
    leftDenom = fullMatch[2];
    rightDenom = fullMatch[5];
  } else {
    const leftAppliedMatch = latex.match(leftAppliedPattern);
    if (leftAppliedMatch && side === "right") {
      leftDenom = leftAppliedMatch[2];
      rightDenom = leftAppliedMatch[5];
    } else {
      const rightAppliedMatch = latex.match(rightAppliedPattern);
      if (rightAppliedMatch && side === "left") {
        leftDenom = rightAppliedMatch[2];
        rightDenom = rightAppliedMatch[5];
      }
    }
  }

  if (!leftDenom || !rightDenom) {
    return { isStep2Context: false };
  }

  if (leftDenom === rightDenom) {
    return { isStep2Context: false };
  }

  const oppositeDenom = side === "left" ? rightDenom : leftDenom;

  return {
    isStep2Context: true,
    side,
    path: astNodeId,
    oppositeDenom,
  };
}
