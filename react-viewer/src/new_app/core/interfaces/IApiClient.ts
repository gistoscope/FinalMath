/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * IApiClient.ts
 * Generic interface for API communication.
 */

export interface ApiRequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface IApiClient {
  get<T>(url: string, config?: ApiRequestConfig): Promise<T>;
  post<T>(url: string, body: any, config?: ApiRequestConfig): Promise<T>;
}
