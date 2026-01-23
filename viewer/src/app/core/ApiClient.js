/**
 * ApiClient.js
 * centralized API client wrapper.
 */

import { Logger } from "./Logger.js";

class ApiClientService {
  constructor() {
    this.baseUrl = "http://localhost:4201";
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Generic fetch wrapper
   * @param {string} endpoint - e.g. "/api/debug"
   * @param {Object} options - fetch options
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    Logger.log(`[API] Request to ${url}`);

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        Logger.error(`[API] Error ${response.status}: ${response.statusText}`);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return response.text();
    } catch (error) {
      Logger.error(`[API] Network error:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export const ApiClient = new ApiClientService();
