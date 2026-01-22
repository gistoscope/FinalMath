import { injectable } from "tsyringe";
import { LocalityFilter } from "./filters/locality.filter.js";
import { RepetitionFilter } from "./filters/repetition.filter.js";
import { SimpleSelector } from "./selectors/simple.selector.js";
import { StepMasterOrchestrator } from "./step-master.orchestrator.js";

/**
 * Factory class for creating configured StepMaster instances.
 */
@injectable()
export class StepMasterFactory {
  constructor(
    private readonly localityFilter: LocalityFilter,
    private readonly repetitionFilter: RepetitionFilter,
    private readonly simpleSelector: SimpleSelector
  ) {}
  /**
   * Creates a default StepMasterOrchestrator with standard filters.
   */
  create(): StepMasterOrchestrator {
    // In a more complex setup, these dependencies might be injected into the factory itself
    // but for now we instantiate them here to encapsulate the wiring.
    const filters = [this.localityFilter, this.repetitionFilter];

    const selector = this.simpleSelector;

    return new StepMasterOrchestrator(filters, selector);
  }
}
