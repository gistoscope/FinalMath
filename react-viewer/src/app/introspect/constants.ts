/**
 * constants.ts - Configuration constants for introspect page
 */

export const CONFIG = {
  HTTP_URL: "http://localhost:4201/mapmaster-introspect",
};

export const SAMPLE_REQUEST = {
  mode: "preview",
  expression: {
    id: "ex-001",
    latex: "\\frac{1}{3} + \\frac{2}{5}",
    displayVersion: "itu-e2e-mapmaster-introspect",
    invariantSetId: "fractions-basic.v1",
  },
  clientEvent: {
    type: "click",
    timestamp: 0,
    latex: "\\frac{1}{3} + \\frac{2}{5}",
    surfaceNodeId: "surf-whole-expression",
    selection: ["surf-frac-1", "surf-plus", "surf-frac-2"],
    click: {
      button: "left",
      clickCount: 1,
      modifiers: {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      },
    },
  },
  tsaSelection: {
    selectionMapVersion: "sm-v1",
    primaryRegionId: "tsa-sum-of-two-fractions",
    allRegionIds: ["tsa-frac-1", "tsa-plus", "tsa-frac-2"],
    flags: { isWholeFraction: false },
  },
  policy: {
    stepLevel: "student",
    allowMultipleSteps: false,
    maxCandidates: 3,
  },
  engineView: {
    stage1: "1/3 + 2/5",
    root: {
      kind: "binaryOp",
      op: "add",
      indexInStage1: 0,
      left: { kind: "rational", numerator: "1", denominator: "3" },
      right: { kind: "rational", numerator: "2", denominator: "5" },
    },
  },
};

export const LOCAL_SUMMARY = {
  expressionId: "ex-001",
  latex: "\\frac{1}{3} + \\frac{2}{5}",
  invariantSetId: "fractions-basic.v1",
  engineStage1: "1/3 + 2/5",
  candidateCount: 1,
  chosenCandidate: {
    id: "step-add-fractions-diff-den-1",
    kind: "add-fractions",
    invariantId: "frac.add.diff-den.v1",
    engineOperation: "ADD_FRACTIONS_DIFF_DEN",
    engineOperands: ["root/left", "root/right"],
  },
  messages: [
    {
      level: "info",
      code: "INVARIANT_MATCH_ADD_DIFF_DEN",
      text: "Matched invariant frac.add.diff-den.v1 for sum of two fractions with different denominators.",
    },
  ],
};

export const TOKEN_DEFS = [
  { id: "surf-frac-1", label: "1/3" },
  { id: "surf-plus", label: "+" },
  { id: "surf-frac-2", label: "2/5" },
];

export const LOCAL_CANDIDATE_SURFACE_REGION_IDS = [
  "surf-frac-1",
  "surf-plus",
  "surf-frac-2",
];
