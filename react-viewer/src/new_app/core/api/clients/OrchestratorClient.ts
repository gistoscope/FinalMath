/* eslint-disable @typescript-eslint/no-explicit-any */

import { singleton } from "tsyringe";
import { BaseApiClient } from "../base/BaseApiClient";

@singleton()
export class OrchestratorClient extends BaseApiClient {
  constructor() {
    super();
    this.baseUrl =
      import.meta.env.VITE_ENGINE_BASE_URL || "http://localhost:4201";
  }

  /**
   * Send a step to the engine
   */
  async sendStep(payload: any): Promise<any> {
    return this.post("/api/entry-step", payload);
  }

  /**
   * Health check
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response: any = await this.get("/health");
      return response?.status === "ok";
    } catch {
      return false;
    }
  }
}
