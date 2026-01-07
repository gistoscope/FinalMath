/**
 * Dependency Registration (Real Implementation)
 *
 * Registers all dependencies for the application, using the REAL core logic from src/
 */

import pino from "pino";
import "reflect-metadata";
import { container } from "tsyringe";
import { createDefaultStudentPolicy, parseExpression } from "./core/stubs";
import {
  InMemoryInvariantRegistry,
  loadAllCoursesFromDir,
} from "./core/stubs/invariants";
import { getStage1RegistryModel } from "./core/stubs/mapmaster/stage1-converter";
import { createPrimitiveMaster } from "./core/stubs/orchestrator/PrimitiveMaster";
import { createPrimitivePatternRegistry } from "./core/stubs/primitive-master/PrimitivePatterns.registry";
import { HANDLER_DEPS_TOKEN, type HandlerDeps } from "./core/types";

// Import core logic from src

export function resolveDependencies() {
  const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });

  const log = (msg: string) => logger.info(msg);

  // 1. Load Invariants (Logic ported from cliEngineHttpServer.ts)
  const fileRegistry = loadAllCoursesFromDir({
    path: "config/courses",
  });

  const stage1Model = getStage1RegistryModel();
  const fileModel = {
    primitives: fileRegistry.getAllPrimitives(),
    invariantSets: fileRegistry.getAllInvariantSets(),
  };

  // Merge primitives
  const mergedPrimitives = [...fileModel.primitives];
  const seenPrimIds = new Set(fileModel.primitives.map((p) => p.id));
  for (const prim of stage1Model.primitives) {
    if (!seenPrimIds.has(prim.id)) {
      mergedPrimitives.push(prim);
      seenPrimIds.add(prim.id);
    }
  }

  // Merge sets
  const mergedSets = [...fileModel.invariantSets];
  const defaultSetIndex = mergedSets.findIndex((s) => s.id === "default");
  if (defaultSetIndex >= 0) {
    const defaultSet = mergedSets[defaultSetIndex];
    const allStage1Rules = stage1Model.invariantSets.flatMap((s) => s.rules);
    const seenRuleIds = new Set(defaultSet.rules.map((r) => r.id));
    for (const rule of allStage1Rules) {
      if (!seenRuleIds.has(rule.id)) {
        defaultSet.rules.push(rule);
        seenRuleIds.add(rule.id);
      }
    }
  }

  // Add standalone Stage 1 sets
  for (const set of stage1Model.invariantSets) {
    if (!mergedSets.find((s) => s.id === set.id)) {
      mergedSets.push(set);
    }
  }

  const invariantRegistry = new InMemoryInvariantRegistry({
    model: {
      primitives: mergedPrimitives,
      invariantSets: mergedSets,
    },
  });

  // 2. Create Policy
  const policy = createDefaultStudentPolicy();

  // 3. Create PrimitiveMaster
  const patternRegistry = createPrimitivePatternRegistry();
  const primitiveMaster = createPrimitiveMaster({
    parseLatexToAst: async (latex) => parseExpression(latex),
    patternRegistry,
    log: (msg) => log(`[PrimitiveMaster] ${msg}`),
  });

  const handlerDeps: HandlerDeps = {
    invariantRegistry,
    policy,
    logger,
    log,
    primitiveMaster,
  };

  // Register HandlerDeps as a singleton
  container.register(HANDLER_DEPS_TOKEN, {
    useValue: handlerDeps,
  });

  logger.info(
    "[Registry] Dependencies registered successfully (using REAL implementation)"
  );
}
