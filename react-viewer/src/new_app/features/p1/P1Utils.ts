/**
 * STEP 2: Detect if clicked integer is a multiplier "1" that participates in diff-denom flow.
 */
export function detectStep2MultiplierContext(
  astNodeId: string | null,
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

  // The character class [+-] does not need backslash escape for hyphen unless it's in a range or other specific context.
  // Original patterns had [+\-] which caused lint errors.
  const fullPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  const leftAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}\s*([+-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1/;
  const rightAppliedPattern =
    /\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*1\s*([+-])\s*\\frac\{([^}]+)\}\{(\d+)\}\s*\\cdot\s*\\frac\{[^}]+\}\{[^}]+\}/;

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
