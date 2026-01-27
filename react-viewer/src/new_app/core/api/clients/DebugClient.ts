import { singleton } from "tsyringe";
import { BaseApiClient } from "../../api/base/BaseApiClient";

@singleton()
export class DebugClient extends BaseApiClient {
  /**
   * Fetch the latest step snapshot.
   */
  public async getLatestSnapshot(): Promise<unknown> {
    return this.get("/debug/step-snapshot/latest");
  }

  /**
   * Fetch the entire debug session log.
   */
  public async getSessionLog(): Promise<unknown> {
    return this.get("/debug/step-snapshot/session");
  }

  /**
   * Reset the debug session log.
   */
  public async resetSession(): Promise<void> {
    return this.post("/debug/step-snapshot/reset", {});
  }

  /**
   * Fetch AST debug info for a given LaTeX string.
   */
  public async fetchAstDebug(latex: string): Promise<unknown> {
    return this.post("/api/ast-debug", { latex });
  }

  /**
   * Fetch MapMaster debug info.
   */
  public async fetchMapDebug(payload: unknown): Promise<unknown> {
    return this.post("/api/mapmaster-debug", payload);
  }

  /**
   * Fetch Global Map debug info.
   */
  public async fetchGlobalMapDebug(payload: unknown): Promise<unknown> {
    return this.post("/api/mapmaster-global-map", payload);
  }

  /**
   * Fetch Primitive Map (Phase 1) debug info.
   */
  public async fetchPrimitiveMapDebug(payload: unknown): Promise<unknown> {
    return this.post("/api/primitive-map-debug", payload);
  }

  /**
   * Resolve an AST selection path.
   */
  public async resolvePath(
    latex: string,
    selectionPath: string,
  ): Promise<unknown> {
    return this.post("/debug/ast/resolve-path", { latex, selectionPath });
  }
}
