/**
 * HttpIntrospectClient.js - Handles HTTP communication with introspect backend
 */

import { CONFIG } from "./constants.js";

/**
 * HttpIntrospectClient - Handles HTTP communication.
 */
export class HttpIntrospectClient {
  /**
   * @param {string} url - Introspect endpoint URL
   */
  constructor(url = CONFIG.HTTP_URL) {
    this._url = url;
  }

  /**
   * Get the endpoint URL.
   * @returns {string}
   */
  get url() {
    return this._url;
  }

  /**
   * Call the HTTP introspect endpoint.
   * @param {Object} request - Request payload
   * @returns {Promise<Object>} Response data
   */
  async call(request) {
    const resp = await fetch(this._url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    if (!data || !data.summary) {
      throw new Error("No summary field in HTTP response");
    }

    return data;
  }

  /**
   * Get loading message for UI display.
   * @returns {string}
   */
  getLoadingMessage() {
    return (
      `Calling ${this._url} ...\n\n` +
      "Make sure the introspect server is running:\n" +
      "  cd D:\\07\\viewer\\display-engine-pipeline\n" +
      "  pnpm tsx ./src/dev/mapmaster-introspect-http-server.ts"
    );
  }
}
