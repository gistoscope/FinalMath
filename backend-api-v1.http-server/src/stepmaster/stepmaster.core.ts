/**
 * StepMaster Core (TzV1.1)
 *
 * Responsibilities:
 *  - Given a list of candidates, history, and policy, decide which step to take.
 */

import type { MapMasterCandidate, MapMasterCandidateId } from "../mapmaster/index";
import type { StepHistorySnapshot } from "./stepmaster.history-service";
import type { StepPolicyConfig } from "./stepmaster.policy";
import { SemanticMap } from "../mapmaster/semantic-map.types";
import { StepMasterMapAdapter } from "./stepmaster-map.adapter";

export type StepMasterDecisionStatus = "chosen" | "no-candidates";

export interface StepMasterInput {
    candidates: MapMasterCandidate[];
    history: StepHistorySnapshot;
    policy: StepPolicyConfig;
    selectionPath?: string | null; // Added selectionPath
}

export interface StepMasterMapInput extends StepMasterInput {
    map: SemanticMap;
}

export interface StepMasterDecision {
    status: StepMasterDecisionStatus;
    chosenCandidateId: MapMasterCandidateId | null;
}

export interface StepMasterResult {
    input: StepMasterInput;
    decision: StepMasterDecision;
}

/**
 * Decide which step to take.
 *
 * TzV1.1 strategy:
 *  - Filter out candidates that are "repetitive" or "looping" based on history.
 *  - Filter out candidates that do not match the selectionPath (Broken Locality Fix).
 *  - If no candidates remain -> "no-candidates"
 *  - Else -> pick the first one (simple student policy)
 */
export function stepMasterDecide(input: StepMasterInput): StepMasterResult {
    const { candidates, history, selectionPath } = input;

    // 1. Filter out looping candidates
    let validCandidates = candidates.filter(candidate => !isCandidateRepetitive(candidate, history));

    // 2. Filter by selectionPath (Broken Locality Fix)
    if (selectionPath) {
        validCandidates = validCandidates.filter(candidate => {
            // Keep if exact match
            if (candidate.targetPath === selectionPath) return true;

            // Keep if candidate targets root (bubbling up to global rules)
            if (candidate.targetPath === "root") return true;

            // Keep if selection is root (allows actions on all children)
            if (selectionPath === "root") return true;

            // Keep if selection is a parent of candidate (e.g. clicking '+' allows simplifying '6/2' child)
            // Logic: candidate.targetPath starts with selectionPath + "."
            if (candidate.targetPath.startsWith(selectionPath + ".")) return true;

            // Otherwise discard (e.g. clicking '5/7' discards '6/2' simplification)
            return false;
        });
    }

    if (validCandidates.length === 0) {
        return {
            input,
            decision: {
                status: "no-candidates",
                chosenCandidateId: null,
            },
        };
    }

    // 3. Apply Policy: Choose the first valid candidate
    // (In the future, we might sort by priority, etc.)
    const chosen = validCandidates[0];

    return {
        input,
        decision: {
            status: "chosen",
            chosenCandidateId: chosen.id,
        },
    };
}

/**
 * New Map-based decision logic (Phase 2)
 */
export function stepMasterDecideFromMap(input: StepMasterMapInput): StepMasterResult {
    const { candidates, history, map, selectionPath } = input;

    // 1. Get allowed actions from Semantic Map
    const allowedActions = StepMasterMapAdapter.getActionsForSelection({
        map,
        selectionPath: selectionPath || null
    });

    // 2. Filter candidates based on allowed actions
    // We match candidates to actions by invariantId and targetNode (via path or id)
    // The Adapter returns SemanticActions. We need to find which candidates correspond to these actions.
    // SemanticAction has `invariantId` and `targetNodeId`.
    // MapMasterCandidate has `invariantRuleId` and `targetPath`.
    // We need to map targetNodeId back to path or use path from node.

    const allowedCandidateIds = new Set<string>();

    for (const action of allowedActions) {
        // Find the node for this action
        const node = map.nodes.find(n => n.id === action.targetNodeId);
        if (!node) continue;

        // Find candidates that match this action's invariant and node's path
        const matchingCandidates = candidates.filter(c =>
            c.invariantRuleId === action.invariantId &&
            c.targetPath === node.path
        );

        matchingCandidates.forEach(c => allowedCandidateIds.add(c.id));
    }

    let validCandidates = candidates.filter(c => allowedCandidateIds.has(c.id));

    // 3. Filter out looping candidates (same as before)
    validCandidates = validCandidates.filter(candidate => !isCandidateRepetitive(candidate, history));

    if (validCandidates.length === 0) {
        return {
            input,
            decision: {
                status: "no-candidates",
                chosenCandidateId: null,
            },
        };
    }

    // 4. Apply Policy: Choose the first valid candidate
    const chosen = validCandidates[0];

    return {
        input,
        decision: {
            status: "chosen",
            chosenCandidateId: chosen.id,
        },
    };
}

/**
 * Check if a candidate repeats the last step.
 */
function isCandidateRepetitive(candidate: MapMasterCandidate, history: StepHistorySnapshot): boolean {
    if (!history.lastStep) return false;

    const lastStep = history.lastStep;

    // Check if we are trying to apply the same rule to the same path immediately again.
    // This catches "idempotent loop" where a rule applies but doesn't change the state (or MapMaster thinks it still applies).
    if (lastStep.invariantRuleId === candidate.invariantRuleId &&
        lastStep.targetPath === candidate.targetPath) {
        return true;
    }

    return false;
}
