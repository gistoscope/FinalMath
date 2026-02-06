import { injectable } from 'tsyringe';
import { InvariantModelDefinition } from '../../../invariant.types';
import { validateInvariantModel } from './validateInvariantModel';
// Static import of course data
import defaultCourseData from './courses/default.course.invariants.json';

@injectable()
export class InvariantCourseLoader {
  /**
   * Validate and load an invariant model from imported JSON data.
   */
  loadInvariantModelFromData(): InvariantModelDefinition {
    const validation = validateInvariantModel(defaultCourseData);

    if (!validation.ok || !validation.model) {
      if (validation.issues.length > 0) {
        const details = validation.issues
          .map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`)
          .join('\n');

        console.error(
          `[InvariantCourseLoader] Invalid invariant model in:\n${details}`,
        );
      }

      return { invariantSets: [], primitives: [] };
    }

    return validation.model;
  }

  /**
   * Load invariant registry from the default course data.
   */
  loadInvariantRegistryFromFile(): InvariantModelDefinition {
    const model = this.loadInvariantModelFromData();
    return model;
  }

  /**
   * Load all courses (currently only the default course with static imports).
   * This method maintains the same interface as before for backward compatibility.
   */
  loadAllCoursesFromDir(): InvariantModelDefinition {
    const model = this.loadInvariantModelFromData();
    return model;
  }
}
