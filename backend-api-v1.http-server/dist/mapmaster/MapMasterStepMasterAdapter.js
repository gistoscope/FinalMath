/**
 * MapMasterStepMasterAdapter — Stage 5.x
 *
 * Small wiring helper that connects MapMasterLite and StepMasterLite
 * so that the EngineStepOrchestrator can keep working with a generic
 * MapMaster-like dependency.
 *
 * The adapter:
 *   - converts OrchestratorMapMasterRequest into EngineStepRequest;
 *   - runs MapMasterLite (`buildMapLite(...)`) to obtain candidates;
 *   - runs StepMasterLite (`choosePrimitiveId(...)`) to choose one primitive;
 *   - returns a plan in the `{ primitiveIds: string[] }` shape expected
 *     by the orchestrator.
 */
import { buildMapLite } from "./MapMasterLite.js";
import { choosePrimitiveId, } from "../stepmaster/StepMasterLite.js";
export function createMapMasterWithStepMasterLite(deps) {
    const stepMasterDeps = deps?.stepMaster;
    return {
        async planStep(mmRequest) {
            const request = {
                expressionId: mmRequest.expression.id,
                mode: mmRequest.mode,
                latex: mmRequest.expression.latex,
                invariantSetId: mmRequest.expression.invariantSetId,
                clientEvent: {
                    type: "click",
                    surfaceNodeId: "surf-whole-expression",
                    selection: [],
                },
            };
            const map = await buildMapLite(request);
            const context = {
                expressionId: request.expressionId,
                latex: request.latex,
                invariantSetId: request.invariantSetId,
                mode: request.mode,
            };
            const primitiveId = choosePrimitiveId({
                candidates: map.candidates,
                context,
            }, stepMasterDeps);
            return {
                primitiveIds: primitiveId ? [primitiveId] : [],
            };
        },
    };
}
