import { SemanticMap, SemanticNode, SemanticAction } from "../mapmaster/semantic-map.types";

export interface StepMasterMapInput {
    map: SemanticMap;
    selectionPath: string | null;
}

export class StepMasterMapAdapter {

    static getActionsForSelection(input: StepMasterMapInput): SemanticAction[] {
        const { map, selectionPath } = input;
        console.log(`[StepMasterMapAdapter] Incoming Path: ${selectionPath}`);
        console.log(`[StepMasterMapAdapter] Map Node Paths: ${map.nodes.map(n => n.path).join(', ')}`);

        if (!selectionPath) {
            // If no selection, maybe return root actions? 
            // Or return nothing?
            // Usually "root" is selected by default if nothing else.
            // Let's assume explicit selection is needed, or we fallback to root if logic dictates.
            // For now, strict: no selection -> no specific node -> try root?
            const root = map.nodes.find(n => n.role === 'expression_root');
            if (root) return this.getActionsForNode(map, root);
            return [];
        }

        // Find the selected node
        let selectedNode: SemanticNode | undefined;

        // Check if selectionPath is a sourceId (e.g. "op-1")
        if (selectionPath.startsWith('op-')) {
            selectedNode = map.nodes.find(n => n.sourceId === selectionPath);
        } else {
            selectedNode = map.nodes.find(n => n.path === selectionPath);
        }

        if (!selectedNode) {
            console.warn(`[StepMasterMapAdapter] Node not found for path/id: ${selectionPath}`);
            // If exact path not found, maybe it's a sub-part of a leaf (like inside a mixed number)?
            // Or maybe the map is built differently.
            // Fallback to root?
            // Let's return empty for strictness, or log warning.
            return [];
        }

        return this.getActionsForNode(map, selectedNode);
    }

    private static getActionsForNode(map: SemanticMap, node: SemanticNode): SemanticAction[] {
        const actions: SemanticAction[] = [];

        // 1. Actions directly on the node
        if (node.actionIds.length > 0) {
            const nodeActions = map.actions.filter(a => node.actionIds.includes(a.id));
            actions.push(...nodeActions);
        }

        // 2. Actions on parent? (Context bubbling)
        // The user said: "or to its parents, if appropriate".
        // In the previous "Broken Locality" fix, we allowed bubbling up to root.
        // But we also want "Target-Specific".
        // If I click "numerator", do I want "simplify fraction" (which is on the Fraction node, the parent)?
        // Yes.
        // If I click "term in sum", do I want "sum" (parent)?
        // Yes.
        // So we should traverse up.

        let current: SemanticNode | undefined = node;
        while (current && current.parentId) {
            const parent = map.nodes.find(n => n.id === current!.parentId);
            if (parent) {
                if (parent.actionIds.length > 0) {
                    const parentActions = map.actions.filter(a => parent.actionIds.includes(a.id));
                    actions.push(...parentActions);
                }
                current = parent;
            } else {
                break;
            }
        }

        // Also check root if we haven't reached it (though loop should handle it if parentId chain is correct)
        // Root has parentId null.

        return actions;
    }
}
