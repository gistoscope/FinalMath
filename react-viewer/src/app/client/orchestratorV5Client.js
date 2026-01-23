export async function runV5Step(endpointUrl, payload, timeoutMs = 5000) {
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
      // Network correct but HTTP error (4xx, 5xx)
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

    // Standardize the response structure provided by backend
    // Backend returns: { status, primitiveId, engineResult, debugInfo, choices }
    return {
      status: json.status || "engine-error",
      primitiveId: json.primitiveId || null,
      engineResult: json.engineResult,
      choices: json.choices || null, // NEW: Include choices for status=choice
      rawResponse: json,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    // Network error, timeout, or parse error
    return {
      status: "engine-error",
      primitiveId: null,
      rawResponse: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
