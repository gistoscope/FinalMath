/* eslint-disable @typescript-eslint/no-explicit-any */
import { injectable } from "tsyringe";
import type { ApiRequestConfig, IApiClient } from "../../interfaces/IApiClient";

@injectable()
export class BaseApiClient implements IApiClient {
  protected baseUrl: string = "";
  protected defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  constructor() {}

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async get<T>(url: string, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: "GET" });
  }

  async post<T>(url: string, body: any, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  protected async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {},
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...config.headers };

    const response = await fetch(url, {
      method: config.method || "GET",
      headers,
      body: config.body,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as any;
  }
}
