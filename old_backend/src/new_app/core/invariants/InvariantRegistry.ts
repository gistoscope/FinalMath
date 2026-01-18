/**
 * InvariantRegistry Class
 *
 * In‑memory registry for primitives and invariant rules.
 * Provides fast lookups by primitive id, rule id, and set id.
 *
 * Responsibilities:
 *  - Store a canonical copy of the validated model
 *  - Provide fast lookups by primitive id, rule id, and set id
 *  - Expose defensive copies so callers cannot mutate internal state
 */

import type {
  InvariantModelDefinition,
  InvariantRuleDefinition,
  InvariantRuleId,
  InvariantSetDefinition,
  InvariantSetId,
  PrimitiveDefinition,
  PrimitiveId,
} from "./invariant.types.js";

/**
 * Configuration object for constructing the InvariantRegistry.
 */
export interface InvariantRegistryConfig {
  model: InvariantModelDefinition;
}

/**
 * InvariantRegistry - Pure domain class for invariant data access
 */
export class InvariantRegistry {
  /** Canonical primitives array (never exposed directly). */
  private readonly primitives: PrimitiveDefinition[];

  /** Canonical invariant sets array (never exposed directly). */
  private readonly invariantSets: InvariantSetDefinition[];

  /** Map from primitive id to primitive definition. */
  private readonly primitiveMap: Map<PrimitiveId, PrimitiveDefinition>;

  /** Map from set id to invariant set definition. */
  private readonly setMap: Map<InvariantSetId, InvariantSetDefinition>;

  /** Map from composite key to rule definition. */
  private readonly ruleMap: Map<string, InvariantRuleDefinition>;

  /** Reverse index: for each primitive id, list of rules that reference it. */
  private readonly primitiveToRulesMap: Map<
    PrimitiveId,
    InvariantRuleDefinition[]
  >;

  constructor(config: InvariantRegistryConfig) {
    const { model } = config;

    // Store canonical copies
    this.primitives = model.primitives.map((p) => this.clonePrimitive(p));
    this.invariantSets = model.invariantSets.map((s) => this.cloneSet(s));

    // Build lookup maps
    this.primitiveMap = new Map();
    for (const prim of this.primitives) {
      this.primitiveMap.set(prim.id, prim);
    }

    this.setMap = new Map();
    this.ruleMap = new Map();
    this.primitiveToRulesMap = new Map();

    for (const set of this.invariantSets) {
      this.setMap.set(set.id, set);

      for (const rule of set.rules) {
        const compositeKey = this.makeRuleKey(set.id, rule.id);
        this.ruleMap.set(compositeKey, rule);

        for (const primitiveId of rule.primitiveIds) {
          let bucket = this.primitiveToRulesMap.get(primitiveId);
          if (!bucket) {
            bucket = [];
            this.primitiveToRulesMap.set(primitiveId, bucket);
          }
          bucket.push(rule);
        }
      }
    }
  }

  /**
   * Return all primitives as defensive copies.
   */
  getAllPrimitives(): PrimitiveDefinition[] {
    return this.primitives.map((p) => this.clonePrimitive(p));
  }

  /**
   * Lookup primitive by id.
   */
  getPrimitiveById(id: PrimitiveId): PrimitiveDefinition | undefined {
    const found = this.primitiveMap.get(id);
    return found ? this.clonePrimitive(found) : undefined;
  }

  /**
   * Return all invariant sets as defensive copies.
   */
  getAllInvariantSets(): InvariantSetDefinition[] {
    return this.invariantSets.map((s) => this.cloneSet(s));
  }

  /**
   * Lookup invariant set by id.
   */
  getInvariantSetById(id: InvariantSetId): InvariantSetDefinition | undefined {
    const found = this.setMap.get(id);
    return found ? this.cloneSet(found) : undefined;
  }

  /**
   * Find a single rule by set id and rule id.
   */
  findRule(
    setId: InvariantSetId,
    ruleId: InvariantRuleId,
  ): InvariantRuleDefinition | undefined {
    const key = this.makeRuleKey(setId, ruleId);
    const found = this.ruleMap.get(key);
    return found ? this.cloneRule(found) : undefined;
  }

  /**
   * Find all rules that reference the given primitive id.
   */
  findRulesByPrimitiveId(primitiveId: PrimitiveId): InvariantRuleDefinition[] {
    const rules = this.primitiveToRulesMap.get(primitiveId);
    if (!rules || rules.length === 0) {
      return [];
    }
    return rules.map((r) => this.cloneRule(r));
  }

  // ========== Private Helpers ==========

  private makeRuleKey(setId: InvariantSetId, ruleId: InvariantRuleId): string {
    return `${setId}::${ruleId}`;
  }

  private clonePrimitive(source: PrimitiveDefinition): PrimitiveDefinition {
    return {
      id: source.id,
      name: source.name,
      description: source.description,
      category: source.category,
      tags: source.tags ? source.tags.slice() : [],
      pattern: source.pattern,
      resultPattern: source.resultPattern,
    };
  }

  private cloneRule(source: InvariantRuleDefinition): InvariantRuleDefinition {
    return {
      id: source.id,
      title: source.title,
      shortStudentLabel: source.shortStudentLabel,
      teacherLabel: source.teacherLabel,
      description: source.description,
      level: source.level,
      tags: source.tags.slice(),
      primitiveIds: source.primitiveIds.slice(),
      scenarioId: source.scenarioId,
      teachingTag: source.teachingTag,
    };
  }

  private cloneSet(source: InvariantSetDefinition): InvariantSetDefinition {
    return {
      id: source.id,
      name: source.name,
      description: source.description,
      version: source.version,
      rules: source.rules.map((r) => this.cloneRule(r)),
    };
  }
}
