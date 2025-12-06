/**
 * PrimitiveRunner — thin adapter contract between EngineStepOrchestrator
 * and the underlying engine (NGIN Lite or its test doubles).
 *
 * This file defines TypeScript-only types for requests and results.
 * It does not perform any I/O by itself.
 */
export async function runPrimitiveStep(request, deps) {
    return deps.runner(request);
}
