/**
 * Step Service (Deprecated)
 *
 * NOTE: This service is deprecated. Use EngineService instead.
 * This file is kept for backward compatibility only.
 *
 * @deprecated Use features/engine/engine.service.ts instead
 */

import { injectable } from "tsyringe";

@injectable()
export class StepService {
  constructor() {
    console.warn(
      "[StepService] This service is deprecated. Use EngineService instead."
    );
  }

  async handleStep(_data: any): Promise<any> {
    throw new Error("StepService is deprecated. Use EngineService instead.");
  }
}
