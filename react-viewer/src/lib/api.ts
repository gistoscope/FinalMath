import axios from "axios";

export interface V5StepPayload {
  sessionId: string;
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  courseId?: string;
  userRole?: string;
  preferredPrimitiveId?: string;
  surfaceNodeKind?: string;
}

export interface StepChoice {
  id: string;
  label: string;
  primitiveId: string;
  targetNodeId: string;
}

export interface V5StepResult {
  status: "step-applied" | "no-candidates" | "engine-error" | "choice" | string;
  primitiveId?: string | null;
  engineResult?: {
    newExpressionLatex: string;
  };
  choices?: StepChoice[] | null;
  rawResponse?: any;
}

/**
 * Calls the V5 Orchestrator endpoint to apply a step.
 * Returns a standardized result object and never throws.
 *
 * @param {string} endpointUrl - The full URL (e.g. http://localhost:4201/api/orchestrator/v5/step)
 * @param {V5StepPayload} payload
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<V5StepResult>}
 */
export async function runV5Step(
  endpointUrl: string,
  payload: V5StepPayload,
  timeoutMs: number = 5000
): Promise<V5StepResult> {
  try {
    const response = await axios.post(endpointUrl, payload, {
      timeout: timeoutMs,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = response.data;

    // Standardize the response structure provided by backend
    // Backend returns: { status, primitiveId, engineResult, debugInfo, choices }
    return {
      status: json.status || "engine-error",
      primitiveId: json.primitiveId || null,
      engineResult: json.engineResult,
      choices: json.choices || null,
      rawResponse: json,
    };
  } catch (err: any) {
    let msg = String(err);
    if (axios.isAxiosError(err)) {
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        msg = `Server Error: ${err.response.status} ${err.response.statusText}`;
        return {
          status: "engine-error",
          primitiveId: null,
          rawResponse: {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data,
          },
        };
      } else if (err.request) {
        // The request was made but no response was received
        msg = "No response received";
      } else {
        // Something happened in setting up the request that triggered an Error
        msg = err.message;
      }
    }

    return {
      status: "engine-error",
      primitiveId: null,
      rawResponse: {
        error: msg,
      },
    };
  }
}
