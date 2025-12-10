export class PrimitiveMatcher {
    match(params) {
        const { table, ctx } = params;
        const matches = [];
        for (const row of table.rows) {
            if (this.isMatch(row, ctx)) {
                matches.push({ row, score: this.calculateScore(row) });
            }
        }
        return matches;
    }
    isMatch(row, ctx) {
        if (row.id === "P.FRAC_ADD_SAME_DEN") {
            console.log(`[Matcher] Checking P.FRAC_ADD_SAME_DEN`);
        }
        if (row.clickTargetKind !== ctx.clickTarget.kind) {
            if (row.id === "P.FRAC_ADD_SAME_DEN") {
                console.log(`[Matcher] FAIL: TargetKind mismatch. Row: ${row.clickTargetKind}, Ctx: ${ctx.clickTarget.kind}`);
            }
            return false;
        }
        if (row.operatorLatex && row.operatorLatex !== ctx.operatorLatex) {
            if (row.id === "P.FRAC_ADD_SAME_DEN") {
                console.log(`[Matcher] FAIL: Operator mismatch. Row: ${row.operatorLatex}, Ctx: ${ctx.operatorLatex}`);
            }
            return false;
        }
        if (row.requiredGuards) {
            for (const g of row.requiredGuards) {
                if (!ctx.guards[g]) {
                    if (row.id === "P.FRAC_ADD_SAME_DEN") {
                        console.log(`[Matcher] FAIL: Missing Guard: ${g}`);
                    }
                    return false;
                }
            }
        }
        if (row.forbiddenGuards) {
            for (const g of row.forbiddenGuards) {
                if (ctx.guards[g]) {
                    if (row.id === "P.FRAC_ADD_SAME_DEN") {
                        console.log(`[Matcher] FAIL: Forbidden Guard Active: ${g}`);
                    }
                    return false;
                }
            }
        }
        if (row.id === "P.FRAC_ADD_SAME_DEN") {
            console.log(`[Matcher] SUCCESS: P.FRAC_ADD_SAME_DEN matched!`);
        }
        return true;
    }
    calculateScore(row) {
        return 1;
    }
}
