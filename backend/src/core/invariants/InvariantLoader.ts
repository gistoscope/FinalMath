/**
 * InvariantLoader Class
 *
 * Loads invariant configurations from files or directories.
 *
 * Responsibilities:
 *  - Load course configurations from JSON files
 *  - Scan directories for course files
 *  - Merge invariant sets and primitives
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { inject, injectable } from "tsyringe";
import { COURSES_DIR, INVARIANT_LOADER_BASE_PATH } from "../../registry.js";
import type {
  InvariantModelDefinition,
  InvariantSetDefinition,
  PrimitiveDefinition,
} from "./invariant.types.js";
import { InvariantRegistry } from "./InvariantRegistry.js";
import { InvariantValidator } from "./InvariantValidator.js";

export interface InvariantLoaderConfig {
  basePath?: string;
}

export interface LoadResult {
  registry: InvariantRegistry;
  errors: string[];
}

/**
 * InvariantLoader - Loads and manages invariant configurations
 */
@injectable()
export class InvariantLoader {
  constructor(
    @inject(INVARIANT_LOADER_BASE_PATH)
    private readonly basePath: string,
    @inject(COURSES_DIR) readonly coursesDir: string
  ) {}

  /**
   * Load all courses from a directory.
   */
  loadFromDirectory(): LoadResult {
    const fullPath = path.resolve(this.basePath, this.coursesDir);
    const errors: string[] = [];

    if (!fs.existsSync(fullPath)) {
      errors.push(`Directory not found: ${fullPath}`);
      return {
        registry: this.createEmptyRegistry(),
        errors,
      };
    }

    const allPrimitives: PrimitiveDefinition[] = [];
    const allSets: InvariantSetDefinition[] = [];
    const seenPrimitiveIds = new Set<string>();
    const seenSetIds = new Set<string>();

    const files = fs.readdirSync(fullPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);

        // Validate the loaded data
        const validation = InvariantValidator.validate(data);
        if (!validation.ok) {
          errors.push(
            `Validation failed for ${file}: ${validation.issues.map((i) => i.message).join(", ")}`
          );
          continue;
        }

        const model = validation.model!;

        // Merge primitives
        for (const prim of model.primitives) {
          if (!seenPrimitiveIds.has(prim.id)) {
            allPrimitives.push(prim);
            seenPrimitiveIds.add(prim.id);
          }
        }

        // Merge sets
        for (const set of model.invariantSets) {
          if (!seenSetIds.has(set.id)) {
            allSets.push(set);
            seenSetIds.add(set.id);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to load ${file}: ${message}`);
      }
    }

    const registry = new InvariantRegistry({
      model: {
        primitives: allPrimitives,
        invariantSets: allSets,
      },
    });

    return { registry, errors };
  }

  /**
   * Load from a single JSON file.
   */
  loadFromFile(filePath: string): LoadResult {
    const fullPath = path.resolve(this.basePath, filePath);
    const errors: string[] = [];

    if (!fs.existsSync(fullPath)) {
      errors.push(`File not found: ${fullPath}`);
      return {
        registry: this.createEmptyRegistry(),
        errors,
      };
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const data = JSON.parse(content);

      const validation = InvariantValidator.validate(data);
      if (!validation.ok) {
        errors.push(`Validation failed: ${validation.issues.map((i) => i.message).join(", ")}`);
        return {
          registry: this.createEmptyRegistry(),
          errors,
        };
      }

      const registry = new InvariantRegistry({ model: validation.model! });
      return { registry, errors: [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to load file: ${message}`);
      return {
        registry: this.createEmptyRegistry(),
        errors,
      };
    }
  }

  /**
   * Create an empty registry.
   */
  private createEmptyRegistry(): InvariantRegistry {
    return new InvariantRegistry({
      model: {
        primitives: [],
        invariantSets: [],
      },
    });
  }

  /**
   * Merge multiple models into one.
   */
  static mergeModels(...models: InvariantModelDefinition[]): InvariantModelDefinition {
    const allPrimitives: PrimitiveDefinition[] = [];
    const allSets: InvariantSetDefinition[] = [];
    const seenPrimitiveIds = new Set<string>();
    const seenSetIds = new Set<string>();

    for (const model of models) {
      for (const prim of model.primitives) {
        if (!seenPrimitiveIds.has(prim.id)) {
          allPrimitives.push(prim);
          seenPrimitiveIds.add(prim.id);
        }
      }

      for (const set of model.invariantSets) {
        if (!seenSetIds.has(set.id)) {
          allSets.push(set);
          seenSetIds.add(set.id);
        }
      }
    }

    return {
      primitives: allPrimitives,
      invariantSets: allSets,
    };
  }
}
