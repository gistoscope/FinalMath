import { StepOrchestrator } from "@/core/index.js";
import { injectable } from "tsyringe";
import { OrchestratorEntryDTO } from "./dtos/orchestrator-entry.dto.js";

@injectable()
export class OrchestratorService {
  constructor(private readonly orchestrator: StepOrchestrator) {}
  async handleEntry(dto: OrchestratorEntryDTO) {
    const body = {
      ...dto,
      selectionPath: dto.selectionPath || null,
      userRole: dto.userRole || "student",
    };

    return await this.orchestrator.runStep(body);
  }
}
