import { inject, injectable, injectAll } from "tsyringe";
import { ICandidateFilter } from "./interfaces/step-filter.interface.js";
import type { ICandidateSelector } from "./interfaces/step-selector.interface.js";
import { StepMasterInput, StepMasterResult } from "./step-master.types.js";

/**
 * Modular StepMaster Orchestrator
 *
 * Coordinates the decision process by piping candidates through filters
 * and then delegating the final choice to a selector.
 */
@injectable()
export class StepMasterOrchestrator {
  constructor(
    @injectAll("CandidateFilter") private filters: ICandidateFilter[],
    @inject("CandidateSelector") private selector: ICandidateSelector
  ) {}

  decide(input: StepMasterInput): StepMasterResult {
    const { candidates, history } = input;
    console.log(
      `[StepMaster] Deciding among ${candidates.length} candidates. Last step exists: ${!!history.lastStep}`
    );

    let validCandidates = candidates;

    // 1. Apple Filters sequentially
    for (const filter of this.filters) {
      if (validCandidates.length === 0) break;
      validCandidates = filter.filter(validCandidates, input);
    }

    console.log(`[StepMaster] Valid candidates: ${validCandidates.length}`);

    // If all filtered out, return no-candidates
    if (validCandidates.length === 0) {
      return this.createResult(input, "no-candidates", null);
    }

    // 2. Select best candidate
    const chosen = this.selector.select(validCandidates);

    if (!chosen) {
      return this.createResult(input, "no-candidates", null);
    }

    console.log(`[StepMaster] Chosen: ${chosen.id}`);

    return this.createResult(input, "chosen", chosen);
  }

  private createResult(
    input: StepMasterInput,
    status: "chosen" | "no-candidates",
    candidate: any | null
  ): StepMasterResult {
    const primitivesToApply = candidate ? candidate.primitiveIds.map((id: string) => ({ id })) : [];

    return {
      input,
      decision: {
        status,
        chosenCandidateId: candidate ? candidate.id : null,
      },
      primitivesToApply,
    };
  }
}
