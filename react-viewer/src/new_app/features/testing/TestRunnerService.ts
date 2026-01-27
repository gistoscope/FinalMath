import { inject, singleton } from "tsyringe";
import { Tokens } from "../../di/tokens";
import type { IMapEngine } from "../../domain/surface-map/interfaces/IMapEngine";
import type { IStoreService } from "../../store/interfaces/IStoreService";
import { P1Service } from "../p1/P1Service";

@singleton()
export class TestRunnerService {
  private readonly store: IStoreService;
  private readonly mapEngine: IMapEngine;
  private readonly p1Service: P1Service;

  constructor(
    @inject(Tokens.IStoreService) store: IStoreService,
    @inject(Tokens.IMapEngine) mapEngine: IMapEngine,
    @inject(P1Service) p1Service: P1Service,
  ) {
    this.store = store;
    this.mapEngine = mapEngine;
    this.p1Service = p1Service;
  }

  /**
   * Run a simple conversion test.
   */
  public async runP1ConversionTest(): Promise<boolean> {
    this.store.updateP1Diagnostics({ lastTestResult: "RUNNING..." });
    const originalLatex = this.store.getLatex();

    try {
      this.store.setLatex("2+3");
      await new Promise((r) => setTimeout(r, 500)); // Wait for render-ish

      const map = this.mapEngine.getCurrentMap();
      if (!map || map.atoms.length === 0) {
        throw new Error("No surface map");
      }

      const firstNum = map.atoms.find((a) => a.kind === "Num");
      if (!firstNum) {
        throw new Error("No Num node found");
      }

      // Sync P1 context
      await this.p1Service.ensureP1IntegerContext(
        firstNum.id,
        firstNum.astNodeId,
      );

      // Apply action
      await this.p1Service.applyCurrentPrimitive();

      const expected = "\\frac{2}{1}+3";
      const actual = this.store.getLatex();
      const passed = actual === expected;

      this.store.updateP1Diagnostics({
        lastTestResult: passed ? "PASS" : `FAIL: got "${actual}"`,
      });

      return passed;
    } catch (err: unknown) {
      this.store.updateP1Diagnostics({
        lastTestResult: `FAIL: ${err instanceof Error ? err.message : String(err)}`,
      });
      return false;
    } finally {
      this.store.setLatex(originalLatex);
    }
  }
}
