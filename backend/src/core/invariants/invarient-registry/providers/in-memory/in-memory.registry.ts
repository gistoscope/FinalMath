import { injectable } from "tsyringe";
import type { InvariantSetDefinition } from "../../../invariant.types";
import type {
  InvariantRuleDefinition,
  InvariantRuleId,
  InvariantSetId,
  PrimitiveDefinition,
  PrimitiveId,
} from "../../invarient-registry.type.ts";
import { InvariantCourseLoader } from "../course-loader/course-loader.invarient";

/**
 * In‑memory registry for primitives and invariant rules.
 *
 * Responsibilities:
 *  - store a canonical copy of the validated model;
 *  - provide fast lookups by primitive id, rule id, and set id;
 *  - expose defensive copies so callers cannot mutate internal state.
 */
@injectable()
export class InMemoryInvariantRegistry {
  private readonly primitives: PrimitiveDefinition[];
  private readonly invariantSets: InvariantSetDefinition[];
  private readonly primitiveMap: Map<PrimitiveId, PrimitiveDefinition>;
  private readonly setMap: Map<InvariantSetId, InvariantSetDefinition>;
  private readonly ruleMap: Map<string, InvariantRuleDefinition>;
  private readonly primitiveToRulesMap: Map<PrimitiveId, InvariantRuleDefinition[]>;

  constructor(private readonly invariantCourseLoader: InvariantCourseLoader) {
    const model = this.invariantCourseLoader.loadInvariantModelFromData();

    this.primitives = model.primitives.map((p) =>
      clonePrimitiveShallow(p as unknown as PrimitiveDefinition)
    );
    this.invariantSets = model.invariantSets.map(cloneSetDeep);

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
        const compositeKey = makeRuleKey(set.id, rule.id);
        this.ruleMap.set(compositeKey, rule as unknown as InvariantRuleDefinition);

        for (const primitiveId of rule.primitiveIds) {
          const pid = primitiveId as unknown as PrimitiveId;
          let bucket = this.primitiveToRulesMap.get(pid);
          if (!bucket) {
            bucket = [];
            this.primitiveToRulesMap.set(pid, bucket);
          }
          bucket.push(rule as unknown as InvariantRuleDefinition);
        }
      }
    }
  }

  init() {}

  /**
   * Return all primitives as defensive copies.
   */
  getAllPrimitives(): PrimitiveDefinition[] {
    return this.primitives.map(clonePrimitiveShallow);
  }

  /**
   * Lookup primitive by id.
   * Returns a defensive copy or undefined if not found.
   */
  getPrimitiveById(id: PrimitiveId): PrimitiveDefinition | undefined {
    const found = this.primitiveMap.get(id);
    return found ? clonePrimitiveShallow(found) : undefined;
  }

  /**
   * Return all invariant sets as defensive copies.
   */
  getAllInvariantSets(): InvariantSetDefinition[] {
    return this.invariantSets.map(cloneSetDeep);
  }

  /**
   * Lookup invariant set by id.
   * Returns a defensive copy or undefined if not found.
   */
  getInvariantSetById(id: InvariantSetId): InvariantSetDefinition | undefined {
    const found = this.setMap.get(id);
    return found ? cloneSetDeep(found) : undefined;
  }

  /**
   * Find a single rule by set id and rule id.
   * Returns a defensive copy or undefined if not found.
   */
  findRule(setId: InvariantSetId, ruleId: InvariantRuleId): InvariantRuleDefinition | undefined {
    const key = makeRuleKey(setId, ruleId);
    const found = this.ruleMap.get(key);
    return found ? cloneRuleShallow(found) : undefined;
  }

  /**
   * Find all rules that reference the given primitive id.
   * Returns an empty array when no rules are found.
   */
  findRulesByPrimitiveId(primitiveId: PrimitiveId): InvariantRuleDefinition[] {
    const rules = this.primitiveToRulesMap.get(primitiveId);
    if (!rules || rules.length === 0) {
      return [];
    }
    return rules.map(cloneRuleShallow);
  }
}

/**
 * Internal helper: build composite rule key.
 */
function makeRuleKey(setId: InvariantSetId, ruleId: InvariantRuleId): string {
  return `${setId}::${ruleId}`;
}

/**
 * Shallow clone helpers.
 * We intentionally copy arrays / objects that may be mutated by callers.
 */

function clonePrimitiveShallow(source: PrimitiveDefinition): PrimitiveDefinition {
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

function cloneRuleShallow(source: InvariantRuleDefinition): InvariantRuleDefinition {
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

function cloneSetDeep(source: InvariantSetDefinition): InvariantSetDefinition {
  return {
    id: source.id,
    name: source.name,
    description: source.description,
    version: source.version,
    rules: source.rules.map(
      (r) => cloneRuleShallow(r as unknown as InvariantRuleDefinition) as any
    ),
  };
}
