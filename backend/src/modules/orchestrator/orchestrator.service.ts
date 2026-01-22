import { InvariantLoader, OrchestratorContext, StepOrchestrator } from "@/core";

import { PrimitiveMaster } from "@/core/primitive-master";
import { StepPolicyFactory } from "@/core/stepmaster/";

import { injectable } from "tsyringe";
import { OrchestratorEntryDTO } from "./dtos/orchestrator-entry.dto";

@injectable()
export class OrchestratorService {
  constructor(
    private readonly orchestrator: StepOrchestrator,
    private readonly invariantLoader: InvariantLoader,
    private readonly stepPolicy: StepPolicyFactory,
    private readonly primitiveMaster: PrimitiveMaster
  ) {}
  async handleEntry(dto: OrchestratorEntryDTO) {
    const context = this.generateContext();

    const body = {
      ...dto,
      selectionPath: dto.selectionPath || null,
      userRole: dto.userRole || "student",
    };

    return await this.orchestrator.runStep(context, body);
  }

  // generate context for OrchestratorContext
  private generateContext(): OrchestratorContext {
    const loadResult = this.invariantLoader.loadFromDirectory();
    if (loadResult.errors.length > 0) {
      console.log(`[Application] Invariant loading warnings: ${loadResult.errors.join(", ")}`);
    }

    const context = {
      invariantRegistry: loadResult.registry,
      policy: this.stepPolicy.createStudentPolicy(),
      primitiveMaster: this.primitiveMaster,
    };

    return context;
  }
}
