import { instrumentLatex as legacyInstrumentLatex } from "../ast-parser";
import { getV5EndpointUrl } from "../core/api";
import { stableIdState } from "../core/state";

export interface InstrumentationResult {
  success: boolean;
  latex: string;
  reason?: string;
  tokenCount?: number;
}

/**
 * Local instrumentation attempt using the AST parser.
 */
export function instrumentLocally(latex: string): InstrumentationResult {
  const result = legacyInstrumentLatex(latex);
  return {
    success: result.success,
    latex: result.latex,
    reason: result.reason,
  };
}

/**
 * Backend instrumentation attempt.
 */
export async function instrumentViaBackend(
  latex: string,
): Promise<InstrumentationResult> {
  const baseEndpoint = getV5EndpointUrl();
  const endpoint = baseEndpoint.replace(
    "/api/orchestrator/v5/step",
    "/api/instrument",
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    if (json.success && json.instrumentedLatex) {
      return {
        success: true,
        latex: json.instrumentedLatex,
        tokenCount: json.tokenCount,
      };
    } else {
      return {
        success: false,
        latex: latex,
        reason: json.reason || "unknown backend error",
      };
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latex: latex,
      reason: `backend unreachable: ${errorMessage}`,
    };
  }
}

/**
 * Synchronize the legacy stableIdState for backward compatibility.
 * This can be removed once Phase 3/4 are complete.
 */
export function syncLegacyStableIdState(
  latex: string,
  result: InstrumentationResult,
) {
  stableIdState.lastExpression = latex;
  stableIdState.enabled = result.success;
  stableIdState.reason = result.reason || null;
}
