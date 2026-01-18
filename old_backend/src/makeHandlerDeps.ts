/**
 * cliEngineHttpServer.ts
 *
 * CLI entry point for the Backend API v1 HTTP server.
 */

import type { HandlerDeps } from "./server/HandlerPostEntryStep";

import { loadAllCoursesFromDir } from "./invariants/index";
import { InMemoryInvariantRegistry } from "./invariants/invariants.registry";
import { logger } from "./logger";
import { parseExpression } from "./mapmaster/ast";
import { getStage1RegistryModel } from "./mapmaster/stage1-converter";
import { createPrimitiveMaster } from "./primitive-master/PrimitiveMaster";
import { createPrimitivePatternRegistry } from "./primitive-master/PrimitivePatterns.registry";
import { createDefaultStudentPolicy } from "./stepmaster/index";

export function makeHandlerDeps(): HandlerDeps {
  const log = (message: string): void => {
    // eslint-disable-next-line no-console
    console.log(message);
  };

  // 1. Load Invariants
  // We scan the config/courses directory for all JSON files.
  const fileRegistry = loadAllCoursesFromDir({
    path: "config/courses",
  });

  // 1b. Merge Stage 1 Invariants (Code-based)
  // This ensures that the orchestrator has access to Stage 1 rules (with correct IDs)
  // even if they are not fully defined in the JSON files yet.
  const stage1Model = getStage1RegistryModel();
  const fileModel = {
    primitives: fileRegistry.getAllPrimitives(),
    invariantSets: fileRegistry.getAllInvariantSets(),
  };

  // Merge primitives (deduplicate by ID)
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

  // Find "default" set and append Stage 1 rules to it
  const defaultSetIndex = mergedSets.findIndex((s) => s.id === "default");
  if (defaultSetIndex >= 0) {
    const defaultSet = mergedSets[defaultSetIndex];
    // We need to add Stage 1 rules to the default set so they are active by default
    // (since frontend sends courseId: "default")

    // Get all Stage 1 rules from all Stage 1 sets
    const allStage1Rules = stage1Model.invariantSets.flatMap((s) => s.rules);

    // Append unique rules to default set
    const seenRuleIds = new Set(defaultSet.rules.map((r) => r.id));
    for (const rule of allStage1Rules) {
      if (!seenRuleIds.has(rule.id)) {
        defaultSet.rules.push(rule);
        seenRuleIds.add(rule.id);
      }
    }
  }

  // Also add the standalone Stage 1 sets (optional, but good for debugging)
  for (const set of stage1Model.invariantSets) {
    if (!mergedSets.find((s) => s.id === set.id)) {
      mergedSets.push(set);
    }
  }

  const finalRegistry = new InMemoryInvariantRegistry({
    model: {
      primitives: mergedPrimitives,
      invariantSets: mergedSets,
    },
  });

  // 2. Create Policy
  const policy = createDefaultStudentPolicy();

  // 3. Create PrimitiveMaster
  const patternRegistry = createPrimitivePatternRegistry() as any;
  const primitiveMaster: any = createPrimitiveMaster({
    parseLatexToAst: async (latex) => parseExpression(latex),
    // patternRegistry,
    log: (msg) => log(`[PrimitiveMaster] ${msg}`),
  });

  const deps: HandlerDeps = {
    invariantRegistry: finalRegistry,
    policy,
    log,
    logger,
    primitiveMaster,
  };

  return deps;
}
