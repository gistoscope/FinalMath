import { singleton } from 'tsyringe';
import { InvariantLoader } from '../invariants';
import { PrimitiveMaster } from '../primitive-master';
import { StepPolicyFactory } from '../stepmaster';
import { OrchestratorContext } from './orchestrator.types';

@singleton()
export class ContextGenerator {
  constructor(
    private readonly invariantLoader: InvariantLoader,
    private readonly stepPolicy: StepPolicyFactory,
    private readonly primitiveMaster: PrimitiveMaster,
  ) {}

  generateContext(): OrchestratorContext {
    const loadResult = this.invariantLoader.loadFromDirectory();
    console.log({ loadResult });
    if (loadResult.errors.length > 0) {
      console.log(
        `[Application] Invariant loading warnings: ${loadResult.errors.join(', ')}`,
      );
    }

    const context = {
      invariantRegistry: loadResult.registry,
      policy: this.stepPolicy.createStudentPolicy(),
      primitiveMaster: this.primitiveMaster,
    };

    return context;
  }
}
