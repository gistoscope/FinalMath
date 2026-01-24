// client/orchestratorV5Client.ts

export interface V5StepPayload {
  sessionId: string;
  expressionLatex: string;
  selectionPath: string | null;
  preferredPrimitiveId?: string;
  courseId?: string;
  userRole?: string;
  userId?: string;
  surfaceNodeKind?: string;
}

export interface V5StepResponse {
  status: string;
  primitiveId: string | null;
  engineResult?: any;
  choices?: any[] | null;
  rawResponse: any;
}

export async function runV5Step(
  endpointUrl: string,
  payload: V5StepPayload,
  timeoutMs: number = 5000,
): Promise<V5StepResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: "engine-error",
        primitiveId: null,
        rawResponse: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    const json = await response.json();

    return {
      status: json.status || "engine-error",
      primitiveId: json.primitiveId || null,
      engineResult: json.engineResult,
      choices: json.choices || null,
      rawResponse: json,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: "engine-error",
      primitiveId: null,
      rawResponse: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
