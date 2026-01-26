// core/ApiClient.ts
// centralized API client wrapper.

import { Logger } from "./Logger";

class ApiClientService {
  private baseUrl: string =
    import.meta.env.VITE_ENGINE_BASE_URL || "http://localhost:4201";
  private defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
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

  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, body: unknown) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

export const ApiClient = new ApiClientService();
