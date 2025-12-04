/**
 * Engine Bridge (TzV2+)
 *
 * Responsibilities:
 *  - Convert an abstract step candidate selected by StepMaster into a concrete request to the Local Engine.
 *  - Convert the Local Engine response into a simple execution result for the orchestrator.
 */

import type { InvariantRuleId, PrimitiveId } from "../invariants/index";
import type { MapMasterCandidate, MapMasterInput } from "../mapmaster/index";
import { PrimitiveRunner } from "./primitive.runner";

export interface EngineStepExecutionRequest {
    expressionLatex: string;
    targetPath: string;
    primitiveId: PrimitiveId;
    invariantRuleId: InvariantRuleId;
    bindings?: Record<string, any>;
    resultPattern?: string;
}

export interface EngineStepExecutionResult {
    ok: boolean;
    newExpressionLatex?: string;
    errorCode?: string;
    appliedRuleId?: string;
}

/**
 * Execute a step via the local engine.
 */
export async function executeStepViaEngine(
    candidate: MapMasterCandidate,
    input: MapMasterInput
): Promise<EngineStepExecutionResult> {
    const request: EngineStepExecutionRequest = {
        expressionLatex: input.expressionLatex,
        targetPath: candidate.targetPath,
        primitiveId: candidate.primitiveIds[0], // Use the first primitive for now
        invariantRuleId: candidate.invariantRuleId,
        bindings: candidate.bindings,
        resultPattern: candidate.resultPattern,
    };

    try {
        // Delegate directly to the robust PrimitiveRunner (Local Engine)
        const result = await PrimitiveRunner.run(request);

        // Pass through the applied rule ID (invariant or primitive)
        // If the runner returns specific applied primitives, we could use that,
        // but for now we trust the candidate's invariantRuleId.
        const appliedRuleId = candidate.invariantRuleId || candidate.primitiveIds[0];

        if (result.ok) {
            return {
                ok: true,
                newExpressionLatex: result.newExpressionLatex,
                appliedRuleId,
            };
        } else {
            return {
                ok: false,
                errorCode: result.errorCode || "no-step",
            };
        }

    } catch (error) {
        return {
            ok: false,
            errorCode: error instanceof Error ? error.message : "Unknown engine error",
        };
    }
}
