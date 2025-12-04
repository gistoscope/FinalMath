import { mapMasterGenerate } from '../src/mapmaster/mapmaster.core';
import { InMemoryInvariantRegistry } from '../src/invariants/invariants.registry';
import { validateInvariantModel } from '../src/invariants/invariants.model';
import { parseExpression, toLatex, replaceNodeAt } from '../src/mapmaster/ast';
import * as fs from 'fs';
import * as path from 'path';

// Load the registry
const configPath = path.resolve(process.cwd(), 'config/courses/default.course.invariants.json');
const configContent = fs.readFileSync(configPath, 'utf-8');
const configJson = JSON.parse(configContent);
const validation = validateInvariantModel(configJson);

if (!validation.ok) {
    console.error("Invalid config:", validation.issues);
    process.exit(1);
}

const registry = new InMemoryInvariantRegistry({ model: validation.model! });

async function runTest() {
    const latex = "(\\frac{6}{2} + \\frac{12}{2}) - (\\frac{5}{7} + \\frac{2}{7})";
    console.log(`\n--- Testing Complex Nested: "${latex}" ---`);

    const ast = parseExpression(latex);
    if (!ast) {
        console.error("Failed to parse AST");
        return;
    }
    console.log("AST parsed successfully.");
    console.log("Re-generated LaTeX:", toLatex(ast));

    // We want to click the first '+' inside the first parens.
    // Indexing:
    // ( -> Group
    // 6/2 -> 0
    // + -> 1
    // 12/2 -> 2
    // )
    // - -> 3
    // ...

    // Let's verify index 1 is indeed the plus.
    const { getNodeByOperatorIndex } = await import('../src/mapmaster/ast');
    const nodeInfo = getNodeByOperatorIndex(ast, 1);
    console.log(`Node at index 1: ${nodeInfo?.node.type} (${(nodeInfo?.node as any).op})`);

    if (!nodeInfo || nodeInfo.node.type !== 'binaryOp' || (nodeInfo.node as any).op !== '+') {
        console.error("Failed to find target node at index 1");
        return;
    }

    // Generate candidates
    const input = {
        expressionLatex: latex,
        selectionPath: null,
        operatorIndex: 1,
        invariantSetIds: ["default"],
        registry: registry
    };

    const result = mapMasterGenerate(input);
    console.log("Candidates found:", result.candidates.length);

    const candidate = result.candidates.find(c => c.primitiveIds.includes("P.FRAC_ADD_SAME"));
    if (candidate) {
        console.log("Found P.FRAC_ADD_SAME candidate.");

        // Simulate execution (Surgical Replacement)
        // P.FRAC_ADD_SAME: a/b + c/b -> (a+c)/b
        // 6/2 + 12/2 -> 18/2

        const newNode = {
            type: "fraction",
            numerator: "18",
            denominator: "2"
        };

        const newAst = replaceNodeAt(ast, candidate.targetPath, newNode as any);
        const output = toLatex(newAst);
        console.log("Resulting LaTeX:", output);

        // Expected: (18/2) - (5/7 + 2/7)
        // Or \left(\frac{18}{2}\right) - \left(\frac{5}{7} + \frac{2}{7}\right)
        // The key is that the SECOND set of parens MUST be preserved.

        if (output.includes("(\\frac{5}{7} + \\frac{2}{7})") || output.includes("\\left(\\frac{5}{7} + \\frac{2}{7}\\right)")) {
            console.log("PASS: Second parentheses preserved.");
        } else {
            console.log("FAIL: Second parentheses lost.");
        }
    } else {
        console.log("FAIL: Candidate P.FRAC_ADD_SAME not found.");
    }
}

runTest();
