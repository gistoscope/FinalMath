import {
  InvariantModelIssue,
  InvariantModelValidationResult,
  InvariantRuleDefinition,
  InvariantRuleId,
  InvariantRuleLevel,
  InvariantSetDefinition,
  InvariantSetId,
  PrimitiveDefinition,
  PrimitiveId,
  VALID_LEVELS,
} from "../invariant.types";

export function validateInvariantModel(input: unknown): InvariantModelValidationResult {
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

  if (!Array.isArray((obj as any).primitives)) {
    issues.push({
      code: "INVALID_SHAPE",
      path: "$.primitives",
      message: "Model.primitives must be an array",
    });
  }

  if (!Array.isArray((obj as any).invariantSets)) {
    issues.push({
      code: "INVALID_SHAPE",
      path: "$.invariantSets",
      message: "Model.invariantSets must be an array",
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const primitivesRaw = (obj as any).primitives as unknown[];
  const invariantSetsRaw = (obj as any).invariantSets as unknown[];

  // 2. Validate primitives
  const primitiveIds = new Set<PrimitiveId>();

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
    if (typeof p.id !== "string" || p.id === "") {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.id`,
        message: "Primitive id must be a non‑empty string",
      });
    }

    if (typeof p.name !== "string" || p.name === "") {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.name`,
        message: "Primitive name must be a non‑empty string",
      });
    }

    if (typeof p.description !== "string" || p.description === "") {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.description`,
        message: "Primitive description must be a non‑empty string",
      });
    }

    if (p.category !== undefined && (typeof p.category !== "string" || p.category === "")) {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.category`,
        message: "Primitive category must be a non‑empty string if present",
      });
    }

    if (p.tags !== undefined) {
      if (!Array.isArray(p.tags)) {
        issues.push({
          code: "INVALID_PRIMITIVE_FIELD",
          path: `${path}.tags`,
          message: "Primitive tags must be an array",
        });
      } else if (!p.tags.every((t) => typeof t === "string")) {
        issues.push({
          code: "INVALID_PRIMITIVE_FIELD",
          path: `${path}.tags`,
          message: "Primitive tags must be an array of strings",
        });
      }
    }

    if (p.pattern !== undefined && (typeof p.pattern !== "string" || p.pattern === "")) {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.pattern`,
        message: "Primitive pattern must be a non‑empty string if present",
      });
    }

    if (
      p.resultPattern !== undefined &&
      (typeof p.resultPattern !== "string" || p.resultPattern === "")
    ) {
      issues.push({
        code: "INVALID_PRIMITIVE_FIELD",
        path: `${path}.resultPattern`,
        message: "Primitive resultPattern must be a non‑empty string if present",
      });
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

  // 3. Validate invariant sets and rules
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

    if (typeof s.id !== "string" || s.id === "") {
      issues.push({
        code: "INVALID_SET_FIELD",
        path: `${path}.id`,
        message: "Set id must be a non‑empty string",
      });
    }

    if (typeof s.name !== "string" || s.name === "") {
      issues.push({
        code: "INVALID_SET_FIELD",
        path: `${path}.name`,
        message: "Set name must be a non‑empty string",
      });
    }

    if (typeof s.description !== "string" || s.description === "") {
      issues.push({
        code: "INVALID_SET_FIELD",
        path: `${path}.description`,
        message: "Set description must be a non‑empty string",
      });
    }

    if (typeof s.version !== "string" || s.version === "") {
      issues.push({
        code: "INVALID_SET_FIELD",
        path: `${path}.version`,
        message: "Set version must be a non‑empty string",
      });
    }

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

    const rules = s.rules as unknown[];
    const ruleIds = new Set<InvariantRuleId>();

    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];
      const rulePath = `${path}.rules[${j}]`;

      if (!rule || typeof rule !== "object") {
        issues.push({
          code: "INVALID_RULE",
          path: rulePath,
          message: "Rule must be an object",
        });
        continue;
      }

      const r = rule as Record<string, unknown>;

      // Required rule fields
      if (typeof r.id !== "string" || r.id === "") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.id`,
          message: "Rule id must be a non‑empty string",
        });
      }

      if (typeof r.title !== "string" || r.title === "") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.title`,
          message: "Rule title must be a non‑empty string",
        });
      }

      if (typeof r.shortStudentLabel !== "string" || r.shortStudentLabel === "") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.shortStudentLabel`,
          message: "Rule shortStudentLabel must be a non‑empty string",
        });
      }

      if (typeof r.description !== "string" || r.description === "") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.description`,
          message: "Rule description must be a non‑empty string",
        });
      }

      if (typeof r.level !== "string" || !VALID_LEVELS.includes(r.level as InvariantRuleLevel)) {
        issues.push({
          code: "INVALID_RULE_LEVEL",
          path: `${rulePath}.level`,
          message: `Rule level must be one of: ${VALID_LEVELS.join(", ")}`,
        });
      }

      if (r.teacherLabel != null && typeof r.teacherLabel !== "string") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.teacherLabel`,
          message: "Rule teacherLabel must be a string when present",
        });
      }

      if (!Array.isArray(r.tags)) {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.tags`,
          message: "Rule tags must be an array",
        });
      } else if (!r.tags.every((t) => typeof t === "string")) {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.tags`,
          message: "Rule tags must be an array of strings",
        });
      }

      if (!Array.isArray(r.primitiveIds)) {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.primitiveIds`,
          message: "Rule primitiveIds must be an array",
        });
      }

      if (r.scenarioId != null && typeof r.scenarioId !== "string") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.scenarioId`,
          message: "Rule scenarioId must be a string when present",
        });
      }

      if (r.teachingTag != null && typeof r.teachingTag !== "string") {
        issues.push({
          code: "INVALID_RULE_FIELD",
          path: `${rulePath}.teachingTag`,
          message: "Rule teachingTag must be a string when present",
        });
      }

      // 4. Referential integrity: primitiveIds must exist
      if (Array.isArray(r.primitiveIds)) {
        for (let k = 0; k < r.primitiveIds.length; k++) {
          const primId = r.primitiveIds[k];
          if (typeof primId === "string" && !primitiveIds.has(primId as PrimitiveId)) {
            issues.push({
              code: "UNKNOWN_PRIMITIVE_ID",
              path: `${rulePath}.primitiveIds[${k}]`,
              message: `Unknown primitive ID: ${primId}`,
            });
          }
        }
      }

      // Duplicate rule IDs within set
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

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // 4. Normalized copy.
  // At this point we trust shapes and types, so we can safely cast.
  const normalizedPrimitives: PrimitiveDefinition[] = primitivesRaw.map((prim) => {
    const p = prim as any;
    return {
      id: p.id as PrimitiveId,
      name: p.name as string,
      description: p.description as string,
      category: p.category as string,
      tags: (p.tags as string[]).slice(),
      pattern: typeof p.pattern === "string" ? p.pattern : undefined,
      resultPattern: typeof p.resultPattern === "string" ? p.resultPattern : undefined,
    };
  });

  const normalizedSets: InvariantSetDefinition[] = invariantSetsRaw.map((set) => {
    const s = set as any;
    const rules: InvariantRuleDefinition[] = (s.rules as any[]).map((rule) => {
      const r = rule as any;
      return {
        id: r.id as InvariantRuleId,
        title: r.title as string,
        shortStudentLabel: r.shortStudentLabel as string,
        teacherLabel: typeof r.teacherLabel === "string" ? (r.teacherLabel as string) : undefined,
        description: r.description as string,
        level: r.level as InvariantRuleLevel,
        tags: (r.tags as string[]).slice(),
        primitiveIds: (r.primitiveIds as string[]).slice() as PrimitiveId[],
        scenarioId: typeof r.scenarioId === "string" ? (r.scenarioId as string) : undefined,
        teachingTag: typeof r.teachingTag === "string" ? (r.teachingTag as string) : undefined,
      };
    });

    return {
      id: s.id as InvariantSetId,
      name: s.name as string,
      description: s.description as string,
      version: s.version as string,
      rules,
    };
  });

  return {
    ok: true,
    issues: [],
    model: {
      primitives: normalizedPrimitives,
      invariantSets: normalizedSets,
    },
  };
}
