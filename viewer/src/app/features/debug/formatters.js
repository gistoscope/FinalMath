// features/debug/formatters.js
// TSA and debug panel formatting functions

/**
 * Format client event for display
 */
export function formatClientEvent(ev) {
  if (!ev) return "—";
  const parts = [];
  if (ev.type) parts.push(ev.type);
  if (ev.surfaceNodeKind) parts.push(ev.surfaceNodeKind);
  if (ev.surfaceNodeId) parts.push(ev.surfaceNodeId);
  return parts.join(" · ");
}

/**
 * Format engine request for display
 */
export function formatEngineRequest(req) {
  if (!req) return "—";
  const base = req.type || "?";
  const srcType = req.clientEvent && req.clientEvent.type;
  return srcType ? base + " ← " + srcType : base;
}

/**
 * Format engine response for display
 */
export function formatEngineResponse(res) {
  if (!res) return "—";
  if (res.type === "error") {
    return "error " + (res.requestType || "") + " · " + (res.message || "");
  }
  const base = (res.type || "ok") + " " + (res.requestType || "");
  const highlights =
    res.result && Array.isArray(res.result.highlights)
      ? res.result.highlights.join(", ")
      : "";
  return highlights ? base + " · highlights: " + highlights : base;
}

/**
 * Truncate string to max length
 */
export function truncate(value, max) {
  if (value == null) return "";
  const s = String(value);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * Format TSA operator info
 */
export function formatTsaOperator(tsa) {
  if (!tsa || !tsa.meta) return "—";
  const idx =
    typeof tsa.meta.operatorIndex === "number" &&
    Number.isFinite(tsa.meta.operatorIndex)
      ? tsa.meta.operatorIndex
      : -1;
  const kind =
    typeof tsa.meta.operatorKind === "string" && tsa.meta.operatorKind
      ? tsa.meta.operatorKind
      : "";
  if (idx < 0 && !kind) return "—";
  return kind ? String(idx) + " · " + kind : String(idx);
}

/**
 * Format TSA window before
 */
export function formatTsaWindowBefore(tsa) {
  if (!tsa) return "—";
  const win = tsa.localWindowBefore || tsa.latexBefore || "";
  if (!win) return "—";
  return truncate(win, 48);
}

/**
 * Format TSA window after
 */
export function formatTsaWindowAfter(tsa) {
  if (!tsa) return "—";
  const win = tsa.localWindowAfter || tsa.latexAfter || "";
  if (!win) return "—";
  return truncate(win, 48);
}

/**
 * Format TSA error
 */
export function formatTsaError(tsa) {
  if (!tsa || !tsa.meta || !tsa.meta.error) return "—";
  const err = tsa.meta.error;
  const kind = err.kind || "Error";
  const msg = err.message || "";
  return truncate(kind + ": " + msg, 60);
}

/**
 * Format TSA strategy
 */
export function formatTsaStrategy(tsa) {
  if (!tsa || !tsa.meta) return "—";
  const s = typeof tsa.meta.strategy === "string" ? tsa.meta.strategy : "";
  return s || "—";
}

/**
 * Format TSA invariant ID
 */
export function formatTsaInvariant(tsa) {
  if (!tsa || !tsa.meta) return "—";
  const id =
    typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
  return id || "—";
}

/**
 * Format TSA invariant text
 */
export function formatTsaInvariantText(tsa) {
  if (!tsa || !tsa.meta) return "—";
  const id =
    typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
  if (!id) return "—";
  switch (id) {
    case "MI1.add-rat-rat":
      return "Adding two rational numbers (Math Invariant #1).";
    case "MI1.sub-rat-rat":
      return "Subtracting two rational numbers (Math Invariant #1).";
    case "MI1.mul-rat-rat":
      return "Multiplying two rational numbers (Math Invariant #1).";
    case "MI1.div-rat-rat":
      return "Dividing two rational numbers (Math Invariant #1).";
    default:
      return id;
  }
}

/**
 * Format student hint from TSA
 */
export function formatStudentHint(tsa) {
  if (!tsa || !tsa.meta) return "—";
  const id =
    typeof tsa.meta.invariantId === "string" ? tsa.meta.invariantId : "";
  if (!id) return "—";
  switch (id) {
    case "MI1.add-rat-rat":
      return "Next step: add two rational numbers (Math Invariant #1).";
    case "MI1.sub-rat-rat":
      return "Next step: subtract two rational numbers (Math Invariant #1).";
    case "MI1.mul-rat-rat":
      return "Next step: multiply two rational numbers (Math Invariant #1).";
    case "MI1.div-rat-rat":
      return "Next step: divide two rational numbers (Math Invariant #1).";
    default:
      return "Invariant step: " + id;
  }
}

/**
 * Count AST nodes from JSON
 */
export function countAstNodesJSON(node) {
  if (!node || typeof node !== "object") return 0;
  switch (node.type) {
    case "rat":
      return 1;
    case "add":
    case "mul": {
      const args = Array.isArray(node.args) ? node.args : [];
      return 1 + args.reduce((sum, x) => sum + countAstNodesJSON(x), 0);
    }
    case "sub":
    case "div":
    case "pow": {
      const l = countAstNodesJSON(node.left);
      const r = countAstNodesJSON(node.right);
      return 1 + l + r;
    }
    case "sqrt":
    case "cbrt": {
      return 1 + countAstNodesJSON(node.arg);
    }
    default:
      return 1;
  }
}

/**
 * Format TSA AST size
 */
export function formatTsaAstSize(tsa) {
  if (!tsa) return "—";
  const before = countAstNodesJSON(tsa.astBeforeJSON);
  const after = countAstNodesJSON(tsa.astAfterJSON);
  if (!before && !after) return "—";
  if (before === after) return String(before);
  return String(before) + " → " + String(after);
}

/**
 * Format TSA log entries
 */
export function formatTsaLog(log) {
  if (!log || !log.length) return "—";
  const lines = log.map((entry, i) => {
    const n = String(i + 1).padStart(2, " ");
    const ts = entry.ts || "";
    const op = entry.operator || "";
    const strat = entry.strategy || "";
    const inv = entry.invariant || "";
    const win = entry.before || "";
    return (
      n +
      ". " +
      ts +
      " · op=" +
      op +
      " · strat=" +
      strat +
      " · inv=" +
      inv +
      " · " +
      win
    );
  });
  return lines.join("\n");
}
