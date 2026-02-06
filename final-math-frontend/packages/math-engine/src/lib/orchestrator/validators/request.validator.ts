/**
 * Request Validator
 *
 * Validates OrchestratorStepRequest objects to ensure all required
 * fields are present and valid before processing.
 */

import { injectable } from 'tsyringe';

import type { InvariantRegistry } from '../../invariants';
import type { OrchestratorStepRequest } from '../orchestrator.types.js';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * RequestValidator - Validates orchestrator step requests
 */
@injectable()
export class RequestValidator {
  /**
   * Validate a step request
   *
   * @param req - The request to validate
   * @returns Validation result
   */
  validate(req: OrchestratorStepRequest): ValidationResult {
    // Validate sessionId
    if (!req.sessionId || req.sessionId.trim() === '') {
      return {
        isValid: false,
        error: 'sessionId is required',
        errorCode: 'missing-session-id',
      };
    }

    // Validate userId
    if (!req.userId || req.userId.trim() === '') {
      return {
        isValid: false,
        error: 'userId is required',
        errorCode: 'missing-user-id',
      };
    }

    // Validate courseId
    if (!req.courseId || req.courseId.trim() === '') {
      return {
        isValid: false,
        error: 'courseId is required',
        errorCode: 'missing-course-id',
      };
    }

    // Validate expressionLatex
    if (!req.expressionLatex || req.expressionLatex.trim() === '') {
      return {
        isValid: false,
        error: 'expressionLatex is required',
        errorCode: 'missing-expression',
      };
    }

    // userRole is optional but should be valid if provided
    if (
      req.userRole &&
      !['student', 'teacher', 'admin'].includes(req.userRole)
    ) {
      return {
        isValid: false,
        error: `Invalid userRole: ${req.userRole}`,
        errorCode: 'invalid-user-role',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate that a course exists in the registry
   *
   * @param courseId - The course ID to check
   * @param registry - The invariant registry
   * @returns Validation result
   */
  validateCourseId(
    courseId: string,
    registry: InvariantRegistry,
  ): ValidationResult {
    const targetSet = registry.getInvariantSetById(courseId);

    if (!targetSet) {
      return {
        isValid: false,
        error: `Course not found: ${courseId}`,
        errorCode: 'course-not-found',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate selection path format
   *
   * @param selectionPath - The selection path to validate
   * @returns Validation result
   */
  validateSelectionPath(
    selectionPath: string | null | undefined,
  ): ValidationResult {
    // Selection path is optional
    if (!selectionPath) {
      return { isValid: true };
    }

    // Basic format validation (should be dot-separated or "root")
    if (selectionPath === 'root') {
      return { isValid: true };
    }

    // Check for valid path format (e.g., "term[0]", "term[0].term[1]")
    const pathRegex = /^(term\[\d+\]|op|root)(\.term\[\d+\]|\.op)*$/;
    if (!pathRegex.test(selectionPath)) {
      return {
        isValid: false,
        error: `Invalid selection path format: ${selectionPath}`,
        errorCode: 'invalid-selection-path',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate operator index
   *
   * @param operatorIndex - The operator index to validate
   * @returns Validation result
   */
  validateOperatorIndex(
    operatorIndex: number | null | undefined,
  ): ValidationResult {
    // Operator index is optional
    if (operatorIndex === null || operatorIndex === undefined) {
      return { isValid: true };
    }

    // Must be non-negative integer
    if (!Number.isInteger(operatorIndex) || operatorIndex < 0) {
      return {
        isValid: false,
        error: `Invalid operator index: ${operatorIndex}`,
        errorCode: 'invalid-operator-index',
      };
    }

    return { isValid: true };
  }
}
