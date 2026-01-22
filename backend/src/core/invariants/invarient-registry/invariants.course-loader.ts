import { type InvariantModelDefinition } from "../invariant.types";

import { InvariantCourseLoader } from "./providers/course-loader/course-loader.invarient";
import { InMemoryInvariantRegistry } from "./providers/in-memory/in-memory.registry";
import { validateInvariantModel } from "./validateInvariantModel";
// Static import of course data

/**
 * Configuration for course loader.
 * Note: With static imports, the path configuration is no longer used.
 * This interface is kept for backward compatibility.
 */
export interface CourseLoaderConfig {
  path?: string;
}

/**
 * Validate and load an invariant model from imported JSON data.
 */
export function loadInvariantModelFromData(
  data: unknown,
  sourceName: string = "course"
): InvariantModelDefinition {
  const validation = validateInvariantModel(data);

  if (!validation.ok || !validation.model) {
    if (validation.issues.length > 0) {
      const details = validation.issues
        .map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`)
        .join("\n");

      console.error(
        `[InvariantCourseLoader] Invalid invariant model in "${sourceName}":\n${details}`
      );
    }

    throw new Error(
      `[InvariantCourseLoader] Course data "${sourceName}" is invalid; see log output for details.`
    );
  }

  return validation.model;
}

/**
 * Load invariant registry from the default course data.
 */
export function loadInvariantRegistryFromFile(
  config?: CourseLoaderConfig
): InMemoryInvariantRegistry {
  const courseLoader = new InvariantCourseLoader();
  return new InMemoryInvariantRegistry(courseLoader);
}

/**
 * Load all courses (currently only the default course with static imports).
 * This function maintains the same interface as before for backward compatibility.
 */
export function loadAllCoursesFromDir(config?: CourseLoaderConfig): InMemoryInvariantRegistry {
  const courseLoader = new InvariantCourseLoader();
  return new InMemoryInvariantRegistry(courseLoader);
}
