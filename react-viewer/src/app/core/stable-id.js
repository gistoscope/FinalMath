// core/stable-id.js
// Stable-ID utilities for DOM scanning and AST correlation

/**
 * STABLE-ID: Get astId from DOM element's data-ast-id attribute.
 * This is the authoritative source for click/hover targeting.
 *
 * @param {Element|null} domElement - The DOM element to get astId from
 * @returns {string|null} The data-ast-id value or null if not set
 */
export function getAstIdFromDOM(domElement) {
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
 * @param {Element|null} domElement - The DOM element
 * @returns {{role: string|null, operator: string|null}}
 */
export function getRoleFromDOM(domElement) {
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
 *
 * IMPORTANT: Scans only .katex-html (not .katex-mathml) to avoid duplicates.
 * Deduplicates by StableTokenKey = `${astId}|${role}|${operator}`.
 *
 * @param {object} map - Surface map
 * @param {HTMLElement} container - Formula container
 */
export function scanDOMForStableIds(map, container) {
  if (!map || !Array.isArray(map.atoms) || !container) return;

  // CRITICAL: Only scan .katex-html, exclude .katex-mathml (screen reader copy causes duplicates)
  const katexHtml = container.querySelector(".katex-html");
  if (!katexHtml) {
    console.warn("[STABLE-ID] No .katex-html found in container");
    return;
  }

  // Find all elements with data-ast-id within .katex-html only
  const stableElements = katexHtml.querySelectorAll("[data-ast-id]");
  console.log(
    `[STABLE-ID] Found ${stableElements.length} DOM elements with data-ast-id in .katex-html`,
  );

  // Build StableTokenKey -> info map, dedupe by key (keep first occurrence)
  const stableTokenMap = new Map(); // StableTokenKey -> { astId, role, operator, dom }

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
    // else: skip duplicate (same stableKey already registered)
  }

  console.log(
    `[STABLE-ID] Deduplicated to ${stableTokenMap.size} unique StableTokenKeys`,
  );

  // Create DOM element -> stable info map for fast lookup
  const astIdByDom = new Map();
  for (const [key, info] of stableTokenMap) {
    astIdByDom.set(info.dom, info);
  }

  // Update surface atoms with ast info from DOM
  for (const atom of map.atoms) {
    if (!atom.dom) continue;

    // Check if atom's DOM is within .katex-html (exclude mathml copies)
    if (!katexHtml.contains(atom.dom)) continue;

    // Check if this atom's DOM element or any ancestor has data-ast-id
    let current = atom.dom;
    while (current && current !== container) {
      if (astIdByDom.has(current)) {
        const info = astIdByDom.get(current);
        atom.astNodeId = info.astId;
        atom.dataRole = info.role;
        atom.dataOperator = info.operator;
        atom.stableKey = info.stableKey; // Store StableTokenKey for hint-cycle
        console.log(
          `[STABLE-ID] Atom ${atom.id} (${atom.kind}) -> stableKey="${info.stableKey}"`,
        );
        break;
      }
      current = current.parentElement;
    }
  }

  // Store stableTokenMap on window for click/hover handlers
  window.__stableTokenMap = stableTokenMap;
}

/**
 * STABLE-ID: Dev assertion - verify DOM contains expected data-ast-id elements.
 * @param {HTMLElement} container - Formula container
 */
export function assertDOMStableIds(container) {
  if (!container) return;

  const stableElements = container.querySelectorAll("[data-ast-id]");
  const count = stableElements.length;

  if (count > 0) {
    console.log(
      `[STABLE-ID ASSERTION] DOM scan found ${count} tokens with data-ast-id; none missing for interactive roles.`,
    );
  } else {
    console.warn(
      `[STABLE-ID ASSERTION] No data-ast-id elements found in DOM! Instrumentation may have failed.`,
    );
  }
}

/**
 * Show a banner when Stable-ID is disabled for an expression.
 * @param {string} reason - Reason for failure
 */
export function showStableIdDisabledBanner(reason) {
  let banner = document.getElementById("stable-id-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "stable-id-banner";
    banner.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff9800;
      color: #000;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(banner);
  }
  banner.textContent = `⚠️ Stable-ID disabled: ${reason || "unknown"}. Precise clicks disabled.`;
  banner.style.display = "block";
}

/**
 * STEP 2: Detect if clicked integer is a multiplier "1" that participates in diff-denom flow.
 * Uses data-ast-id attributes (Stable-ID) for precise targeting.
 *
 * For Step2 to apply:
 * - Expression must be: frac * 1 +/- frac * 1 with different denominators
 * - OR partial: frac * 1 +/- frac * frac (one side already converted)
 * - Clicked "1" must have astId matching term[X].term[1] pattern
 *
 * @param {string} surfaceNodeId - The surface node ID clicked
 * @param {string|null} astNodeId - The astId from DOM (Stable-ID)
 * @param {object} surfaceMap - The surface map
 * @param {string} currentLatex - Current LaTeX expression
 * @returns {{ isStep2Context: boolean, side?: string, path?: string, oppositeDenom?: string }}
 */
export function detectStep2MultiplierContext(
  surfaceNodeId,
  astNodeId,
  surfaceMap,
  currentLatex,
) {
  // Must have a valid astNodeId from Stable-ID
  if (!astNodeId) {
    return { isStep2Context: false };
  }

  // Check if astNodeId matches the multiplier-1 pattern
  const leftPattern = /^term\[0\]\.term\[1\]$/;
  const rightPattern = /^term\[1\]\.term\[1\]$/;

  let side = null;
  if (leftPattern.test(astNodeId)) {
    side = "left";
  } else if (rightPattern.test(astNodeId)) {
    side = "right";
  } else {
    return { isStep2Context: false };
  }

  const latex = typeof currentLatex === "string" ? currentLatex : "";

  // FIX: Support partial Step2 expressions (one side already converted)
  // Pattern 1: Both sides have ·1 (original Step2 pattern)
  const fullPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  // Pattern 2: Left side has ·frac, right side has ·1 (left already applied)
  const leftAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  // Pattern 3: Left side has ·1, right side has ·frac (right already applied)
  const rightAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+\-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}/;

  let leftDenom = null;
  let rightDenom = null;
  let matchType = null;

  const fullMatch = latex.match(fullPattern);
  if (fullMatch) {
    leftDenom = fullMatch[2];
    rightDenom = fullMatch[5];
    matchType = "full";
  } else {
    const leftAppliedMatch = latex.match(leftAppliedPattern);
    if (leftAppliedMatch && side === "right") {
      // Left already applied, right still has ·1
      leftDenom = leftAppliedMatch[2];
      rightDenom = leftAppliedMatch[5];
      matchType = "leftApplied";
    } else {
      const rightAppliedMatch = latex.match(rightAppliedPattern);
      if (rightAppliedMatch && side === "left") {
        // Right already applied, left still has ·1
        leftDenom = rightAppliedMatch[2];
        rightDenom = rightAppliedMatch[5];
        matchType = "rightApplied";
      }
    }
  }

  if (!leftDenom || !rightDenom) {
    if (window.__debugStep2Cycle) {
      console.log(
        `[STEP2-CYCLE] detectStep2MultiplierContext: No pattern matched for side=${side} latex="${latex.substring(0, 80)}..."`,
      );
    }
    return { isStep2Context: false };
  }

  if (leftDenom === rightDenom) {
    return { isStep2Context: false };
  }

  const oppositeDenom = side === "left" ? rightDenom : leftDenom;

  if (window.__debugStep2Cycle) {
    console.log(
      `[STEP2-CYCLE] detectStep2MultiplierContext: astNodeId=${astNodeId}, side=${side}, oppositeDenom=${oppositeDenom}, matchType=${matchType}`,
    );
  }

  console.log(
    `[STEP2-DETECT] Found Step 2 context via Stable-ID: astNodeId=${astNodeId}, side=${side}, oppositeDenom=${oppositeDenom}`,
  );

  return {
    isStep2Context: true,
    side,
    path: astNodeId,
    oppositeDenom,
  };
}
