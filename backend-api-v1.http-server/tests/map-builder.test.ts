import { describe, test, expect } from "vitest";
import { MapBuilder } from "../src/mapmaster/map-builder";
import { AstNode } from "../src/mapmaster/ast";
import { MapMasterCandidate } from "../src/mapmaster/mapmaster.core";

describe("MapBuilder", () => {
    test("should build map for simple addition 3 + 5", () => {
        const latex = "3 + 5";
        const ast: AstNode = {
            type: "binaryOp",
            op: "+",
            left: { type: "integer", value: "3" },
            right: { type: "integer", value: "5" }
        };
        const candidates: MapMasterCandidate[] = [
            {
                id: "cand-1" as any,
                invariantRuleId: "rule-add",
                primitiveIds: ["P.INT_ADD"],
                targetPath: "root",
                description: "Add integers",
                resultPattern: "8"
            }
        ];

        const map = MapBuilder.build(latex, ast, candidates);

        expect(map.latex).toBe(latex);
        expect(map.rootNodeId).toBe("node_0");
        expect(map.nodes.length).toBe(3); // Root, Left, Right

        const root = map.nodes.find(n => n.role === "expression_root");
        expect(root).toBeDefined();
        expect(root?.syntacticType).toBe("SUM");
        expect(root?.flags.hasActions).toBe(true);
        expect(root?.actionIds.length).toBe(1);

        const action = map.actions.find(a => a.id === root?.actionIds[0]);
        expect(action).toBeDefined();
        expect(action?.invariantId).toBe("rule-add");
        expect(action?.resultLatex).toBe("8");
    });

    test("should assign roles for fraction", () => {
        const latex = "\\frac{3}{5}";
        // Note: In our current AST, FractionNode is a leaf with string numerator/denominator
        const ast: AstNode = {
            type: "fraction",
            numerator: "3",
            denominator: "5"
        };

        const map = MapBuilder.build(latex, ast, []);

        expect(map.nodes.length).toBe(1);
        const node = map.nodes[0];
        expect(node.syntacticType).toBe("FRACTION");
        expect(node.role).toBe("expression_root");
        // Since it's a leaf in AST, we don't have child nodes for 3 and 5
    });

    test("should handle complex expression (3+5)*2", () => {
        const latex = "(3+5)*2";
        const ast: AstNode = {
            type: "binaryOp",
            op: "*",
            left: {
                type: "group",
                content: {
                    type: "binaryOp",
                    op: "+",
                    left: { type: "integer", value: "3" },
                    right: { type: "integer", value: "5" }
                }
            },
            right: { type: "integer", value: "2" }
        };

        const map = MapBuilder.build(latex, ast, []);

        // Root (*)
        // Left (Group)
        // Left.Content (+)
        // Left.Content.Left (3)
        // Left.Content.Right (5)
        // Right (2)
        // Total 6 nodes
        expect(map.nodes.length).toBe(6);

        const groupNode = map.nodes.find(n => n.syntacticType === "PAREN");
        expect(groupNode).toBeDefined();
        expect(groupNode?.role).toBe("product_factor"); // Left child of *
    });
});
