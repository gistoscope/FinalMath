/**
 * InvariantValidator Class
 *
 * Validates invariant model definitions for structural integrity.
 *
 * Responsibilities:
 *  - Shape validation (correct object structure)
 *  - Field validation (non-empty strings, correct types)
 *  - Duplicate detection (IDs must be unique)
 *  - Referential integrity (primitive IDs must exist)
 */

import { injectable } from "tsyringe";
import {
  VALID_LEVELS,
  type InvariantModelDefinition,
  type InvariantModelIssue,
  type InvariantModelValidationResult,
  type InvariantRuleDefinition,
  type InvariantRuleId,
  type InvariantRuleLevel,
  type InvariantSetDefinition,
  type InvariantSetId,
  type PrimitiveDefinition,
  type PrimitiveId,
} from "./invariant.types.js";

@injectable()
export class InvariantValidator {
  /**
   * Validate the complete invariant model for structural integrity.
   */
  static validate(input: unknown): InvariantModelValidationResult {
    const validator = new InvariantValidator();
    return validator.validateModel(input);
  }

  /**
   * Instance method for validation
   */
  validateModel(input: unknown): InvariantModelValidationResult {
    const issues: InvariantModelIssue[] = [];

    // 1. Shape validation
    if (!input || typeof input !== "object") {
      issues.push({
        code: "INVALID_SHAPE",
        path: "$",
        message: "Model must be an object",
      });
      return { ok: false, issues };
    }

    const obj = input as Record<string, unknown>;

    if (!Array.isArray(obj.primitives)) {
      issues.push({
        code: "INVALID_SHAPE",
        path: "$.primitives",
        message: "Model.primitives must be an array",
      });
    }

    if (!Array.isArray(obj.invariantSets)) {
      issues.push({
        code: "INVALID_SHAPE",
        path: "$.invariantSets",
        message: "Model.invariantSets must be an array",
      });
    }

    if (issues.length > 0) {
      return { ok: false, issues };
    }

    const primitivesRaw = obj.primitives as unknown[];
    const invariantSetsRaw = obj.invariantSets as unknown[];

    // 2. Validate primitives
    const primitiveIds = new Set<PrimitiveId>();
    this.validatePrimitives(primitivesRaw, primitiveIds, issues);

    // 3. Validate invariant sets and rules
    this.validateInvariantSets(invariantSetsRaw, primitiveIds, issues);

    if (issues.length > 0) {
      return { ok: false, issues };
    }

    // 4. Build normalized model
    const model = this.buildNormalizedModel(primitivesRaw, invariantSetsRaw);

    return { ok: true, issues: [], model };
  }

  private validatePrimitives(
    primitivesRaw: unknown[],
    primitiveIds: Set<PrimitiveId>,
    issues: InvariantModelIssue[],
  ): void {
    for (let i = 0; i < primitivesRaw.length; i++) {
      const prim = primitivesRaw[i];
      const path = `$.primitives[${i}]`;

      if (!prim || typeof prim !== "object") {
        issues.push({
          code: "INVALID_PRIMITIVE",
          path,
          message: "Primitive must be an object",
        });
        continue;
      }

      const p = prim as Record<string, unknown>;

      // Required string fields
      this.validateStringField(p.id, `${path}.id`, "id", issues, true);
      this.validateStringField(p.name, `${path}.name`, "name", issues, true);
      this.validateStringField(
        p.description,
        `${path}.description`,
        "description",
        issues,
        true,
      );

      // Optional fields
      if (p.category !== undefined) {
        this.validateStringField(
          p.category,
          `${path}.category`,
          "category",
          issues,
          false,
        );
      }

      if (p.tags !== undefined) {
        this.validateStringArray(p.tags, `${path}.tags`, "tags", issues);
      }

      if (p.pattern !== undefined) {
        this.validateStringField(
          p.pattern,
          `${path}.pattern`,
          "pattern",
          issues,
          false,
        );
      }

      if (p.resultPattern !== undefined) {
        this.validateStringField(
          p.resultPattern,
          `${path}.resultPattern`,
          "resultPattern",
          issues,
          false,
        );
      }

      // Duplicate IDs
      if (typeof p.id === "string" && p.id !== "") {
        const id = p.id as PrimitiveId;
        if (primitiveIds.has(id)) {
          issues.push({
            code: "DUPLICATE_PRIMITIVE_ID",
            path: `${path}.id`,
            message: `Duplicate primitive ID: ${id}`,
          });
        } else {
          primitiveIds.add(id);
        }
      }
    }
  }

  private validateInvariantSets(
    invariantSetsRaw: unknown[],
    primitiveIds: Set<PrimitiveId>,
    issues: InvariantModelIssue[],
  ): void {
    const setIds = new Set<InvariantSetId>();

    for (let i = 0; i < invariantSetsRaw.length; i++) {
      const set = invariantSetsRaw[i];
      const path = `$.invariantSets[${i}]`;

      if (!set || typeof set !== "object") {
        issues.push({
          code: "INVALID_SET",
          path,
          message: "Set must be an object",
        });
        continue;
      }

      const s = set as Record<string, unknown>;

      // Required fields
      this.validateStringField(s.id, `${path}.id`, "id", issues, true);
      this.validateStringField(s.name, `${path}.name`, "name", issues, true);
      this.validateStringField(
        s.description,
        `${path}.description`,
        "description",
        issues,
        true,
      );
      this.validateStringField(
        s.version,
        `${path}.version`,
        "version",
        issues,
        true,
      );

      if (!Array.isArray(s.rules)) {
        issues.push({
          code: "INVALID_SET_FIELD",
          path: `${path}.rules`,
          message: "Set rules must be an array",
        });
        continue;
      }

      // Duplicate set IDs
      if (typeof s.id === "string" && s.id !== "") {
        const id = s.id as InvariantSetId;
        if (setIds.has(id)) {
          issues.push({
            code: "DUPLICATE_SET_ID",
            path: `${path}.id`,
            message: `Duplicate set ID: ${id}`,
          });
        } else {
          setIds.add(id);
        }
      }

      // Validate rules
      this.validateRules(s.rules as unknown[], path, primitiveIds, issues);
    }
  }

  private validateRules(
    rules: unknown[],
    setPath: string,
    primitiveIds: Set<PrimitiveId>,
    issues: InvariantModelIssue[],
  ): void {
    const ruleIds = new Set<InvariantRuleId>();

    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];
      const rulePath = `${setPath}.rules[${j}]`;

      if (!rule || typeof rule !== "object") {
        issues.push({
          code: "INVALID_RULE",
          path: rulePath,
          message: "Rule must be an object",
        });
        continue;
      }

      const r = rule as Record<string, unknown>;

      // Required fields
      this.validateStringField(r.id, `${rulePath}.id`, "id", issues, true);
      this.validateStringField(
        r.title,
        `${rulePath}.title`,
        "title",
        issues,
        true,
      );
      this.validateStringField(
        r.shortStudentLabel,
        `${rulePath}.shortStudentLabel`,
        "shortStudentLabel",
        issues,
        true,
      );
      this.validateStringField(
        r.description,
        `${rulePath}.description`,
        "description",
        issues,
        true,
      );

      // Level validation
      if (
        typeof r.level !== "string" ||
        !VALID_LEVELS.includes(r.level as InvariantRuleLevel)
      ) {
        issues.push({
          code: "INVALID_RULE_LEVEL",
          path: `${rulePath}.level`,
          message: `Rule level must be one of: ${VALID_LEVELS.join(", ")}`,
        });
      }

      // Tags validation
      this.validateStringArray(r.tags, `${rulePath}.tags`, "tags", issues);

      // Primitive IDs validation
      if (!Array.isArray(r.primitiveIds)) {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.primitiveIds`,
          message: "Rule primitiveIds must be an array",
        });
      } else {
        // Referential integrity
        for (let k = 0; k < r.primitiveIds.length; k++) {
          const primId = r.primitiveIds[k];
          if (
            typeof primId === "string" &&
            !primitiveIds.has(primId as PrimitiveId)
          ) {
            issues.push({
              code: "UNKNOWN_PRIMITIVE_ID",
              path: `${rulePath}.primitiveIds[${k}]`,
              message: `Unknown primitive ID: ${primId}`,
            });
          }
        }
      }

      // Duplicate rule IDs
      if (typeof r.id === "string" && r.id !== "") {
        const id = r.id as InvariantRuleId;
        if (ruleIds.has(id)) {
          issues.push({
            code: "DUPLICATE_RULE_ID_IN_SET",
            path: `${rulePath}.id`,
            message: `Duplicate rule ID in set: ${id}`,
          });
        } else {
          ruleIds.add(id);
        }
      }
    }
  }

  private validateStringField(
    value: unknown,
    path: string,
    fieldName: string,
    issues: InvariantModelIssue[],
    required: boolean,
  ): void {
    if (required && (typeof value !== "string" || value === "")) {
      issues.push({
        code: "INVALID_FIELD",
        path,
        message: `${fieldName} must be a non-empty string`,
      });
    } else if (
      !required &&
      value !== undefined &&
      (typeof value !== "string" || value === "")
    ) {
      issues.push({
        code: "INVALID_FIELD",
        path,
        message: `${fieldName} must be a non-empty string if present`,
      });
    }
  }

  private validateStringArray(
    value: unknown,
    path: string,
    fieldName: string,
    issues: InvariantModelIssue[],
  ): void {
    if (!Array.isArray(value)) {
      issues.push({
        code: "INVALID_FIELD",
        path,
        message: `${fieldName} must be an array`,
      });
    } else if (!value.every((t) => typeof t === "string")) {
      issues.push({
        code: "INVALID_FIELD",
        path,
        message: `${fieldName} must be an array of strings`,
      });
    }
  }

  private buildNormalizedModel(
    primitivesRaw: unknown[],
    invariantSetsRaw: unknown[],
  ): InvariantModelDefinition {
    const primitives: PrimitiveDefinition[] = primitivesRaw.map((prim) => {
      const p = prim as Record<string, unknown>;
      return {
        id: p.id as PrimitiveId,
        name: p.name as string,
        description: p.description as string,
        category: p.category as string | undefined,
        tags: Array.isArray(p.tags) ? (p.tags as string[]).slice() : [],
        pattern:
          typeof p.pattern === "string" ? (p.pattern as string) : undefined,
        resultPattern:
          typeof p.resultPattern === "string"
            ? (p.resultPattern as string)
            : undefined,
      };
    });

    const invariantSets: InvariantSetDefinition[] = invariantSetsRaw.map(
      (set) => {
        const s = set as Record<string, unknown>;
        const rules: InvariantRuleDefinition[] = (s.rules as unknown[]).map(
          (rule) => {
            const r = rule as Record<string, unknown>;
            return {
              id: r.id as InvariantRuleId,
              title: r.title as string,
              shortStudentLabel: r.shortStudentLabel as string,
              teacherLabel:
                typeof r.teacherLabel === "string"
                  ? (r.teacherLabel as string)
                  : undefined,
              description: r.description as string,
              level: r.level as InvariantRuleLevel,
              tags: (r.tags as string[]).slice(),
              primitiveIds: (
                r.primitiveIds as string[]
              ).slice() as PrimitiveId[],
              scenarioId:
                typeof r.scenarioId === "string"
                  ? (r.scenarioId as string)
                  : undefined,
              teachingTag:
                typeof r.teachingTag === "string"
                  ? (r.teachingTag as string)
                  : undefined,
            };
          },
        );

        return {
          id: s.id as InvariantSetId,
          name: s.name as string,
          description: s.description as string,
          version: s.version as string,
          rules,
        };
      },
    );

    return { primitives, invariantSets };
  }
}
