import { readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import {
  validateInvariantModel,
  type InvariantModelDefinition,
  type InvariantSetDefinition,
  type PrimitiveDefinition,
} from "./invariants.model";
import { InMemoryInvariantRegistry } from "./invariants.registry";

/**
 * Configuration for course loader.
 *
 * `path` may be absolute or relative to the backend project root
 * (folder that contains package.json).
 */
export interface CourseLoaderConfig {
  path: string;
}

/**
 * Resolve backend project root based on this module location.
 */
function resolveBackendRootFromHere(): string {
  return resolve(__dirname, "..", "..");
}

/**
 * Load a single invariant model from a JSON file.
 */
export function loadInvariantModelFromFile(
  fullPath: string
): InvariantModelDefinition {
  let raw: string;
  try {
    raw = readFileSync(fullPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[InvariantCourseLoader] Failed to read course file at "${fullPath}": ${message}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[InvariantCourseLoader] Failed to parse JSON from "${fullPath}": ${message}`
    );
  }

  const validation = validateInvariantModel(parsed);

  if (!validation.ok || !validation.model) {
    if (validation.issues.length > 0) {
      const details = validation.issues
        .map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`)
        .join("\n");

      console.error(
        `[InvariantCourseLoader] Invalid invariant model in "${fullPath}":\n${details}`
      );
    }

    throw new Error(
      `[InvariantCourseLoader] Course file "${fullPath}" is invalid; see log output for details.`
    );
  }

  return validation.model;
}

/**
 * Load invariant registry from a single course JSON file.
 */
export function loadInvariantRegistryFromFile(
  config: CourseLoaderConfig
): InMemoryInvariantRegistry {
  if (!config || typeof config.path !== "string" || config.path.trim() === "") {
    throw new Error(
      "[InvariantCourseLoader] config.path must be a non-empty string"
    );
  }

  const backendRoot = resolveBackendRootFromHere();
  const fullPath = isAbsolute(config.path)
    ? config.path
    : resolve(backendRoot, config.path);

  const model = loadInvariantModelFromFile(fullPath);
  return new InMemoryInvariantRegistry({ model });
}

/**
 * Load all course JSON files from a directory and merge them into a single registry.
 */
export function loadAllCoursesFromDir(
  config: CourseLoaderConfig
): InMemoryInvariantRegistry {
  if (!config || typeof config.path !== "string" || config.path.trim() === "") {
    throw new Error(
      "[InvariantCourseLoader] config.path must be a non-empty string"
    );
  }

  const backendRoot = resolveBackendRootFromHere();
  const dirPath = isAbsolute(config.path)
    ? config.path
    : resolve(backendRoot, config.path);

  let files: string[];
  try {
    files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  } catch (error) {
    throw new Error(
      `[InvariantCourseLoader] Failed to list directory "${dirPath}": ${error}`
    );
  }

  if (files.length === 0) {
    console.warn(`[InvariantCourseLoader] No JSON files found in "${dirPath}"`);
    return new InMemoryInvariantRegistry({
      model: { primitives: [], invariantSets: [] },
    });
  }

  const allPrimitives: PrimitiveDefinition[] = [];
  const allSets: InvariantSetDefinition[] = [];
  const seenPrimitiveIds = new Set<string>();
  const seenSetIds = new Set<string>();

  for (const file of files) {
    const fullPath = join(dirPath, file);
    try {
      // Skip directories if any
      if (statSync(fullPath).isDirectory()) continue;

      const model = loadInvariantModelFromFile(fullPath);

      // Merge Primitives (Deduplicate by ID)
      for (const prim of model.primitives) {
        if (!seenPrimitiveIds.has(prim.id)) {
          seenPrimitiveIds.add(prim.id);
          allPrimitives.push(prim);
        }
      }

      // Merge Sets (Error on Duplicate ID)
      for (const set of model.invariantSets) {
        if (seenSetIds.has(set.id)) {
          throw new Error(
            `[InvariantCourseLoader] Duplicate InvariantSet ID "${set.id}" found in "${file}"`
          );
        }
        seenSetIds.add(set.id);
        allSets.push(set);
      }
    } catch (error) {
      console.error(
        `[InvariantCourseLoader] Error loading course file "${file}":`,
        error
      );
      // We choose to fail fast if any course file is invalid
      throw error;
    }
  }

  return new InMemoryInvariantRegistry({
    model: {
      primitives: allPrimitives,
      invariantSets: allSets,
    },
  });
}
