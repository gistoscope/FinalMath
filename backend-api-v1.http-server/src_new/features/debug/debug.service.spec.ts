/**
 * Debug Service Tests
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultStudentPolicy,
  createStubInvariantRegistry,
} from "../../core/stubs";
import { HANDLER_DEPS_TOKEN } from "../../core/types";
import { DebugService } from "./debug.service";

describe("DebugService", () => {
  let debugService: DebugService;

  beforeEach(() => {
    container.clearInstances();

    const mockDeps = {
      invariantRegistry: createStubInvariantRegistry(),
      policy: createDefaultStudentPolicy(),
      log: vi.fn(),
      logger: undefined,
    };

    container.register(HANDLER_DEPS_TOKEN, { useValue: mockDeps });
    debugService = container.resolve(DebugService);
  });

  describe("handleAstDebug", () => {
    it("should parse latex and return AST", async () => {
      const result = await debugService.handleAstDebug({
        latex: "1+2",
      });

      expect(result.ok).toBe(true);
      expect(result.ast).toBeDefined();
    });
  });

  describe("handleMapMasterDebug", () => {
    it("should return empty candidates (stub)", async () => {
      const result = await debugService.handleMapMasterDebug({
        latex: "1+2",
        selection: {},
      });

      expect(result.ok).toBe(true);
      expect(result.candidates).toEqual([]);
    });
  });

  describe("handleStepMasterDebug", () => {
    it("should return stub result", async () => {
      const result = await debugService.handleStepMasterDebug({
        latex: "1+2",
        selection: {},
      });

      expect(result.ok).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe("handleInstrument", () => {
    it("should return instrumented latex", async () => {
      const result = await debugService.handleInstrument({
        latex: "\\frac{1}{2}",
      });

      expect(result.ok).toBe(true);
      expect(result.instrumentedLatex).toContain("htmlData");
    });
  });

  describe("handleAstPathDebug", () => {
    it("should return path debug info", async () => {
      const result = await debugService.handleAstPathDebug({
        latex: "1+2",
        selectionPath: "root",
      } as any);

      expect(result.ok).toBe(true);
      expect(result.path).toBe("root");
    });
  });

  describe("handleOperatorValidation", () => {
    it("should return validation result", async () => {
      const result = await debugService.handleOperatorValidation({
        latex: "1+2",
        operatorPath: "root",
      });

      expect(result.ok).toBe(true);
      expect(result.validationType).toBe("direct");
    });
  });

  describe("handlePrimitiveMapDebug", () => {
    it("should return empty primitives (stub)", async () => {
      const result = await debugService.handlePrimitiveMapDebug({
        latex: "1+2",
      });

      expect(result.ok).toBe(true);
      expect(result.primitives).toEqual([]);
    });
  });

  describe("handleStepSnapshot", () => {
    it("should return snapshot or message", async () => {
      const result = await debugService.handleStepSnapshot();
      expect(result).toBeDefined();
    });
  });

  describe("handleTraceHub", () => {
    it("should return traces", async () => {
      const result = await debugService.handleTraceHub();
      expect(result.traces).toBeDefined();
      expect(Array.isArray(result.traces)).toBe(true);
    });
  });

  describe("handleClearTraceHub", () => {
    it("should clear and return ok", async () => {
      const result = await debugService.handleClearTraceHub();
      expect(result.ok).toBe(true);
    });
  });
});
