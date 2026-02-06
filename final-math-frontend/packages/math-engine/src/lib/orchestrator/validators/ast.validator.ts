/**
 * AST Validator
 *
 * Validates AST nodes and provides utilities for AST validation.
 */

import { injectable } from "tsyringe";
import { AstUtils } from "../../ast/utils.ast.js";

/**
 * Validation result
 */
export interface AstValidationResult {
  isValid: boolean;
  error?: string;
  nodeType?: string;
}

/**
 * AstValidator - Validates AST nodes and structure
 */
@injectable()
export class AstValidator {
  constructor(private readonly astUtils: AstUtils) {}

  /**
   * Validate that an AST is not null/undefined
   *
   * @param ast - The AST to validate
   * @returns Validation result
   */
  isValidAst(ast: any): AstValidationResult {
    if (!ast) {
      return {
        isValid: false,
        error: "AST is null or undefined",
      };
    }

    if (typeof ast !== "object") {
      return {
        isValid: false,
        error: "AST is not an object",
      };
    }

    if (!ast.type) {
      return {
        isValid: false,
        error: "AST node missing 'type' property",
      };
    }

    return { isValid: true, nodeType: ast.type };
  }

  /**
   * Get the type of a node at a given path
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @returns The node type, or null if not found
   */
  getNodeType(ast: any, path: string): string | null {
    const node = this.astUtils.getNodeAt(ast, path);
    return node?.type || null;
  }

  /**
   * Validate that a node exists at a given path
   *
   * @param ast - The AST
   * @param path - The path to validate
   * @returns Validation result
   */
  validateNodeExists(ast: any, path: string): AstValidationResult {
    const node = this.astUtils.getNodeAt(ast, path);

    if (!node) {
      return {
        isValid: false,
        error: `No node found at path: ${path}`,
      };
    }

    return { isValid: true, nodeType: node.type };
  }

  /**
   * Validate that a node at a path is of a specific type
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @param expectedType - The expected node type
   * @returns Validation result
   */
  validateNodeType(ast: any, path: string, expectedType: string): AstValidationResult {
    const node = this.astUtils.getNodeAt(ast, path);

    if (!node) {
      return {
        isValid: false,
        error: `No node found at path: ${path}`,
      };
    }

    if (node.type !== expectedType) {
      return {
        isValid: false,
        error: `Expected node type '${expectedType}', got '${node.type}'`,
        nodeType: node.type,
      };
    }

    return { isValid: true, nodeType: node.type };
  }

  /**
   * Validate that a node is a binary operator
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @returns Validation result
   */
  validateIsBinaryOp(ast: any, path: string): AstValidationResult {
    return this.validateNodeType(ast, path, "binaryOp");
  }

  /**
   * Validate that a node is an integer
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @returns Validation result
   */
  validateIsInteger(ast: any, path: string): AstValidationResult {
    return this.validateNodeType(ast, path, "integer");
  }

  /**
   * Validate that a node is a fraction
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @returns Validation result
   */
  validateIsFraction(ast: any, path: string): AstValidationResult {
    return this.validateNodeType(ast, path, "fraction");
  }

  /**
   * Check if a node is of a specific type (convenience method)
   *
   * @param ast - The AST
   * @param path - The path to the node
   * @param type - The type to check
   * @returns true if the node is of the specified type
   */
  isNodeType(ast: any, path: string, type: string): boolean {
    const node = this.astUtils.getNodeAt(ast, path);
    return node?.type === type;
  }
}
