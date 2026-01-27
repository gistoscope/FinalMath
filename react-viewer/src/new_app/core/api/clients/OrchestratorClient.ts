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
   * Execute a V5 orchestrator step
   */
  async runV5Step(payload: any): Promise<any> {
    const v5Payload: any = {
      sessionId: payload.sessionId || `session-${Date.now()}`,
      expressionLatex: payload.expressionLatex,
      selectionPath: payload.selectionPath || null,
      operatorIndex: payload.selectionPath ? undefined : payload.operatorIndex,
      courseId: payload.courseId || "default",
      userRole: payload.userRole || "student",
      surfaceNodeKind: payload.surfaceNodeKind || null,
      clickTargetKind:
        payload.surfaceNodeRole === "operator"
          ? "operator"
          : ["Num", "Number", "Integer"].includes(payload.surfaceNodeKind)
            ? "number"
            : payload.surfaceNodeKind === "Fraction"
              ? "fractionBar"
              : null,
      operator: payload.operator || null,
      surfaceNodeId: payload.surfaceNodeId || null,
      preferredPrimitiveId: payload.preferredPrimitiveId || null,
    };

    return this.post("/api/orchestrator/v5/step", v5Payload);
  }

  /**
   * Validate an operator selection
   */
  async validateOperator(latex: string, operatorPath: string): Promise<any> {
    return this.post("/api/orchestrator/v5/validate-operator", {
      latex,
      operatorPath,
    });
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
