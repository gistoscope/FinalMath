// core/api.js
// API utilities and engine communication

// ============================================================
// UNIFIED ENGINE BASE URL UTILITY
// ============================================================
// Single source of truth for backend base URL
export function getEngineBaseUrl() {
  if (typeof window !== "undefined" && window.__v5EndpointUrl) {
    // Extract base from full URL like "http://localhost:4201/api/orchestrator/v5/step"
    const url = window.__v5EndpointUrl;
    const match = url.match(/^(https?:\/\/[^/]+)/);
    return match ? match[1] : "http://localhost:4201";
  }
  return "http://localhost:4201";
}

// V5 endpoint URL
export const V5_ENDPOINT_URL = "http://localhost:4201/api/orchestrator/v5/step";

/**
 * Get the V5 endpoint URL from global config or default
 */
export function getV5EndpointUrl() {
  return typeof window !== "undefined" && window.__v5EndpointUrl
    ? window.__v5EndpointUrl
    : V5_ENDPOINT_URL;
}

// Expose globally for debug tools
if (typeof window !== "undefined") {
  window.getEngineBaseUrl = getEngineBaseUrl;
}
