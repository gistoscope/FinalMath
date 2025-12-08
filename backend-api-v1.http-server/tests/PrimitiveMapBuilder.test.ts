import { describe, it, expect } from "vitest";
import { parseExpression } from "../src/mapmaster/ast";
import { buildPrimitiveMap } from "../src/engine/primitives/PrimitiveMapBuilder";

function buildMapFromLatex(latex: string, stage = 1) {
    const trimmed = latex.trim();
    const ast = parseExpression(trimmed);
    if (!ast) throw new Error("Failed to parse expression");
    return buildPrimitiveMap(ast, stage, trimmed);
}

describe.skip("PrimitiveMapBuilder", () => {
    it("builds a ready FRAC_ADD_SAME_DEN_STAGE1 primitive for 1/7 + 3/7", () => {
        const map = buildMapFromLatex("\\frac{1}{7} + \\frac{3}{7}");

        expect(map.operatorCount).toBe(1);
        expect(map.entries.length).toBe(1);

        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("FRAC_ADD_SAME_DEN_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("builds a ready FRAC_ADD_SAME_DEN_STAGE1 primitive for 4/7 + 5/7", () => {
        const map = buildMapFromLatex("\\frac{4}{7} + \\frac{5}{7}");

        expect(map.operatorCount).toBe(1);
        expect(map.entries.length).toBe(1);

        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("FRAC_ADD_SAME_DEN_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("handles three-term sum 1/7 + 3/7 + 5/7 with one ready primitive and one none", () => {
        const map = buildMapFromLatex("\\frac{1}{7} + \\frac{3}{7} + \\frac{5}{7}");

        expect(map.operatorCount).toBeGreaterThanOrEqual(2);

        const readyFracAdd = map.entries.find(
            e => e.primitiveId === "FRAC_ADD_SAME_DEN_STAGE1" && e.status === "ready"
        );
        expect(readyFracAdd).toBeDefined();

        const noneEntries = map.entries.filter(e => e.status === "none");
        expect(noneEntries.length).toBeGreaterThanOrEqual(1);
    });

    it("builds INT_ADD_STAGE1 for 2 + 3", () => {
        const map = buildMapFromLatex("2 + 3");

        expect(map.operatorCount).toBe(1);
        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("INT_ADD_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("builds INT_SUB_STAGE1 for 2 - 3", () => {
        const map = buildMapFromLatex("2 - 3");

        expect(map.operatorCount).toBe(1);
        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("INT_SUB_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("builds MIXED_ADD_INT_FRAC_STAGE1 for 2 + 1/3", () => {
        const map = buildMapFromLatex("2 + \\frac{1}{3}");

        expect(map.operatorCount).toBe(1);
        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("MIXED_ADD_INT_FRAC_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("builds MIXED_ADD_INT_FRAC_STAGE1 for 1/3 + 2", () => {
        const map = buildMapFromLatex("\\frac{1}{3} + 2");

        expect(map.operatorCount).toBe(1);
        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("MIXED_ADD_INT_FRAC_STAGE1");
        expect(entry.status).toBe("ready");
    });

    it("builds MIXED_SUB_INT_FRAC_STAGE1 for 2 - 1/3", () => {
        const map = buildMapFromLatex("2 - \\frac{1}{3}");

        expect(map.operatorCount).toBe(1);
        const entry = map.entries[0];

        expect(entry.primitiveId).toBe("MIXED_SUB_INT_FRAC_STAGE1");
        expect(entry.status).toBe("ready");
    });
});
