// core/api.ts
// API utilities and engine communication

// ============================================================
// UNIFIED ENGINE BASE URL UTILITY
// ============================================================
const ENGINE_BASE_URL =
  import.meta.env.VITE_ENGINE_BASE_URL || "http://localhost:4201";
const V5_PATH = import.meta.env.VITE_V5_ENDPOINT || "/api/orchestrator/v5/step";

// Single source of truth for backend base URL
export function getEngineBaseUrl(): string {
  return ENGINE_BASE_URL;
}

// V5 endpoint URL
export const V5_ENDPOINT_URL = `${ENGINE_BASE_URL}${V5_PATH}`;

/**
 * Get the V5 endpoint URL
 */
export function getV5EndpointUrl(): string {
  return V5_ENDPOINT_URL;
}
