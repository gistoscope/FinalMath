import "reflect-metadata";
import { AstParser } from "./src/core/ast/parser.ast.js";
import { AstUtils } from "./src/core/ast/utils.ast.js";

const parser = new AstParser();
const utils = new AstUtils();

const latex = "\\frac{1}{2} + \\left(\\frac{3}{4} - \\frac{1}{1+\\frac{1}{2}}\\right)";
const ast = parser.parse(latex);
if (ast) {
  const original = utils.toLatex(ast);
  console.log("Original parsed to latex:", original);

  // mimic replace: node path term[1].term[1].den.term[0]
  // The expression is: 1/2 + (3/4 - 1 / (1 + 1/2))
  const replacement = { type: "fraction", numerator: "2", denominator: "2" };
  const newAst = utils.replaceNodeAt(ast, "term[1].term[1].den.term[0]", replacement as any);
  console.log("Replaced latex:", utils.toLatex(newAst));
}
