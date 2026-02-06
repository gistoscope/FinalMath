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

import { injectable } from 'tsyringe';
import type {
  InvariantSetDefinition,
  PrimitiveDefinition,
} from './invariant.types.js';
import { InvariantRegistry } from './InvariantRegistry.js';
import { InvariantValidator } from './InvariantValidator.js';
import * as InvariantsCourses from './invarient-registry/providers/course-loader/courses/default.course.invariants.json';

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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}
  /**
   * Load all courses from a directory.
   */
  loadFromDirectory(): LoadResult {
    const errors: string[] = [];

    const allPrimitives: PrimitiveDefinition[] = [];
    const allSets: InvariantSetDefinition[] = [];
    const seenPrimitiveIds = new Set<string>();
    const seenSetIds = new Set<string>();

    try {
      let data = InvariantsCourses as any;
      if (data.default) {
        data = data.default;
      }

      // Validate the loaded data
      const validation = InvariantValidator.validate(data);
      if (!validation.ok) {
        errors.push(
          `Validation failed for ${validation.issues.map((i) => i.message).join(', ')}`,
        );
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
      errors.push(`Failed to load ${'InvariantsCourses'}: ${message}`);
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
}
