import { mapMasterDebug } from "../mapmaster/mapmaster.debug";
import { InMemoryInvariantRegistry } from "../invariants/invariants.registry";
import { STAGE1_INVARIANT_SETS } from "../mapmaster/mapmaster.invariants.registry";
import { stepMasterDecide } from "../stepmaster/stepmaster.core";
import { createEmptyHistory, getSnapshot, appendStepFromResult } from "../stepmaster/stepmaster.history-service";
export async function handlePostStepDebug(req, res, body) {
    const request = body;
    if (!request || typeof request.latex !== "string" || !request.selection) {
        sendJson(res, 400, {
            type: "error",
            message: "Invalid request: 'latex' and 'selection' are required."
        });
        return;
    }
    try {
        // 1. Setup Registry (Duplicated from HandlerPostMapMasterDebug)
        const { getStage1RegistryModel } = await import("../mapmaster/stage1-converter");
        const model = getStage1RegistryModel();
        const registry = new InMemoryInvariantRegistry({ model });
        const invariantSetIds = STAGE1_INVARIANT_SETS.map(s => s.id);
        // 2. Run MapMaster (via debug to get AST and candidates)
        const mapInput = {
            expressionLatex: request.latex,
            selectionPath: request.selection.selectionPath || null,
            operatorIndex: request.selection.operatorIndex,
            invariantSetIds: invariantSetIds,
            registry: registry
        };
        const mapDebugResult = mapMasterDebug(mapInput);
        // 3. Prepare StepMaster Input
        const session = request.session || createEmptyHistory();
        const historySnapshot = getSnapshot(session);
        const stepInput = {
            candidates: mapDebugResult.candidates,
            history: historySnapshot,
            policy: { id: "student.default", maxCandidatesToShow: 1 } // Default policy
        };
        // 4. Run StepMaster
        const stepResult = stepMasterDecide(stepInput);
        // 5. Update Session (Simulated)
        const updatedSession = appendStepFromResult(session, stepResult, request.latex);
        // 6. Build Result
        const result = {
            astSnapshot: mapDebugResult.astSnapshot,
            map: {
                candidates: mapDebugResult.candidates,
                resolvedSelectionPath: mapDebugResult.pipeline.selection.anchorNodeId // Use anchor as resolved path
            },
            stepMasterInput: stepInput,
            stepMasterOutput: stepResult,
            updatedSession
        };
        sendJson(res, 200, {
            type: "ok",
            result: result
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sendJson(res, 500, {
            type: "error",
            message: `StepMaster debug error: ${msg}`
        });
    }
}
function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}
