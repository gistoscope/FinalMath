export class PrimitiveSelector {
    select(matches) {
        if (matches.length === 0) {
            return { kind: 'no-candidates', matches: [] };
        }
        const blueMatches = matches.filter(m => m.row.color === 'blue');
        if (blueMatches.length > 0) {
            return {
                kind: 'blue-choice',
                primitive: blueMatches[0].row,
                matches: matches
            };
        }
        const redMatches = matches.filter(m => m.row.color === 'red');
        if (redMatches.length > 0) {
            return { kind: 'red-diagnostic', primitive: redMatches[0].row, matches };
        }
        const best = matches[0];
        const kind = best.row.color === 'yellow' ? 'yellow-scenario' : 'green-primitive';
        return { kind: kind, primitive: best.row, matches };
    }
}
