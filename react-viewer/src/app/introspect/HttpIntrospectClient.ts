/**
 * HttpIntrospectClient.ts - Handles HTTP communication with introspect backend
 */

import { CONFIG } from "./constants";

export class HttpIntrospectClient {
  private _url: string;

  constructor(url: string = CONFIG.HTTP_URL) {
    this._url = url;
  }

  get url(): string {
    return this._url;
  }

  async call(request: unknown): Promise<unknown> {
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

  getLoadingMessage(): string {
    return (
      `Calling ${this._url} ...\n\n` +
      "Make sure the introspect server is running:\n" +
      "  cd display-engine-pipeline\n" +
      "  pnpm tsx ./src/dev/mapmaster-introspect-http-server.ts"
    );
  }
}
