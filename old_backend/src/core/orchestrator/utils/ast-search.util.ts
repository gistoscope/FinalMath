/**
 * AST Search Utilities
 *
 * Provides utility functions for searching and traversing AST nodes.
 */

import { injectable } from "tsyringe";

/**
 * AstSearch - Utility class for searching AST nodes
 */
@injectable()
export class AstSearch {
  /**
   * Find the first integer node path in the AST using DFS.
   * Used as fallback when selectionPath doesn't resolve to an integer.
   *
   * @param ast - The AST to search
   * @returns The path to the first integer node, or null if not found
   *
   * @example
   * const astSearch = new AstSearch();
   * const path = astSearch.findFirstIntegerPath(ast);
   * // Returns: "root.term[0]" or null
   */
  findFirstIntegerPath(ast: any): string | null {
    if (!ast) return null;

    // DFS to find first integer (left-to-right order)
    const stack: Array<{ node: any; path: string }> = [{ node: ast, path: "root" }];

    while (stack.length > 0) {
      const { node, path } = stack.pop()!;
      if (!node) continue;

      if (node.type === "integer") {
        return path;
      }

      // For binaryOp, add children using term[0]/term[1] format
      // Push right first so left is processed first (left-to-right traversal)
      if (node.type === "binaryOp") {
        if (node.right) {
          const rightPath = path === "root" ? "term[1]" : `${path}.term[1]`;
          stack.push({ node: node.right, path: rightPath });
        }
        if (node.left) {
          const leftPath = path === "root" ? "term[0]" : `${path}.term[0]`;
          stack.push({ node: node.left, path: leftPath });
        }
      }
    }

    return null;
  }
}
