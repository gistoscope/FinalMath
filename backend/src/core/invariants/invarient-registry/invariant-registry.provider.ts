/**
 * MapMaster Invariants Registry (Local)
 *
 * Defines the pattern metadata for Stage-1 invariants.
 * This serves as a local extension to the core InMemoryInvariantRegistry,
 * allowing us to use pattern-based filtering logic from CLOD.
 */

import { container, injectable } from "tsyringe";
import { InvariantPattern } from "./invarient-registry.type";
import { STAGE1_INVARIANT_SETS } from "./sets";

/**
 * Helper to find pattern for a rule ID.
 */
@injectable()
export class InvariantRegistryProvider {
  /**
   * Helper to find pattern for a rule ID.
   */
  findPatternForRule(ruleId: string): InvariantPattern | undefined {
    for (const set of STAGE1_INVARIANT_SETS) {
      const rule = set.rules.find((r) => r.id === ruleId);
      if (rule) return rule.pattern;
    }
    return undefined;
  }

  /**
   * Helper to find domain for a rule ID.
   */
  findDomainForRule(ruleId: string): string | undefined {
    for (const set of STAGE1_INVARIANT_SETS) {
      const rule = set.rules.find((r) => r.id === ruleId);
      if (rule) return rule.domain;
    }
    return undefined;
  }
}

const registry = container.resolve(InvariantRegistryProvider);

export function findPatternForRule(ruleId: string): InvariantPattern | undefined {
  return registry.findPatternForRule(ruleId);
}

export function findDomainForRule(ruleId: string): string | undefined {
  return registry.findDomainForRule(ruleId);
}
