/**
 * Core Stubs
 *
 * These are minimal stub implementations of the core business logic.
 * They allow src_new/ to start independently from src/.
 *
 * TODO: Migrate actual implementations from src/ when ready.
 */

// ============ Auth Service Stub ============

export type UserRole = "student" | "teacher" | "admin";

export interface AuthToken {
  userId: string;
  role: UserRole;
}

export const authService = {
  validateToken(token: string): AuthToken | null {
    // Stub: Return a default student token for any non-empty token
    if (!token || token.length === 0) {
      return null;
    }
    // In production, this would validate the JWT
    return {
      userId: "stub-user",
      role: "student",
    };
  },
};

// ============ Session Service Stub ============

export interface StepHistoryEntry {
  expressionBefore: string;
  expressionAfter: string;
  errorCode?: string;
  timestamp: number;
}

export interface StepHistory {
  entries: StepHistoryEntry[];
}

export interface Session {
  id: string;
  userId?: string;
  createdAt: number;
  history: StepHistory;
}

const sessions = new Map<string, Session>();

export const SessionService = {
  async getHistory(
    sessionId: string,
    _userId?: string,
    _role?: UserRole
  ): Promise<StepHistory> {
    const session = sessions.get(sessionId);
    if (session) {
      return session.history;
    }
    // Create new session if not exists
    const newHistory: StepHistory = { entries: [] };
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: Date.now(),
      history: newHistory,
    });
    return newHistory;
  },

  async updateHistory(sessionId: string, history: StepHistory): Promise<void> {
    const session = sessions.get(sessionId);
    if (session) {
      session.history = history;
    } else {
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        history,
      });
    }
  },

  async findAllSessionsByUserId(userId: string): Promise<Session[]> {
    const result: Session[] = [];
    for (const session of sessions.values()) {
      if (session.userId === userId) {
        result.push(session);
      }
    }
    return result;
  },
};

// ============ Step Policy Config Stub ============

export type StepPolicyId = "student.default" | "teacher.debug";

export interface StepPolicyConfig {
  id: StepPolicyId;
  maxCandidatesToShow: number;
}

export function createDefaultStudentPolicy(): StepPolicyConfig {
  return {
    id: "student.default",
    maxCandidatesToShow: 1,
  };
}

export function createTeacherDebugPolicy(): StepPolicyConfig {
  return {
    id: "teacher.debug",
    maxCandidatesToShow: 999,
  };
}

// ============ Invariant Registry Stub ============

export interface InvariantSetInfo {
  id: string;
  name: string;
}

export interface InMemoryInvariantRegistry {
  getInvariantSetById(id: string): InvariantSetInfo | null;
}

export function createStubInvariantRegistry(): InMemoryInvariantRegistry {
  return {
    getInvariantSetById(id: string): InvariantSetInfo | null {
      // Stub: Return a basic set for any ID
      return {
        id,
        name: `Invariant Set: ${id}`,
      };
    },
  };
}

// ============ Orchestrator Stub ============

export type OrchestratorStepStatus =
  | "step-applied"
  | "no-candidates"
  | "engine-error"
  | "choice";

export interface OrchestratorStepRequest {
  sessionId: string;
  courseId: string;
  expressionLatex: string;
  selectionPath: string | null;
  operatorIndex?: number;
  userRole: UserRole;
  userId?: string;
  preferredPrimitiveId?: string;
  surfaceNodeKind?: string;
  clickTargetKind?: string;
  operator?: string;
  surfaceNodeId?: string;
}

export interface EngineStepExecutionResult {
  ok: boolean;
  newExpressionLatex?: string;
  errorCode?: string;
}

export interface OrchestratorStepResult {
  history: StepHistory;
  engineResult: EngineStepExecutionResult | null;
  status: OrchestratorStepStatus;
  debugInfo?: {
    allCandidates?: unknown[];
    [key: string]: unknown;
  } | null;
}

export interface OrchestratorContext {
  invariantRegistry: InMemoryInvariantRegistry;
  policy: StepPolicyConfig;
  primitiveMaster?: any; // Stub type
}

/**
 * Stub orchestrator step execution.
 * Returns a "no-candidates" response.
 *
 * TODO: Implement actual orchestrator logic.
 */
export async function runOrchestratorStep(
  _ctx: OrchestratorContext,
  req: OrchestratorStepRequest
): Promise<OrchestratorStepResult> {
  const history = await SessionService.getHistory(req.sessionId);

  console.log(
    `[Orchestrator Stub] Received step request for expression: ${req.expressionLatex}`
  );

  // Stub: Return no-candidates
  return {
    status: "no-candidates",
    engineResult: null,
    history,
    debugInfo: {
      message: "Orchestrator stub - not implemented",
    },
  };
}

// ============ Protocol Types ============

export interface EngineStepResponse {
  ok: boolean;
  newExpressionLatex?: string;
  errorCode?: string;
}

export interface HintResponse {
  hint?: string;
  primitiveId?: string;
}

// ============ PrimitiveMaster Stub ============

export interface PrimitiveMaster {
  resolveClickTarget(
    ast: any,
    selectionPath: string,
    operatorIndex?: number
  ): Promise<any>;
  resolvePrimitive(request: any): Promise<any>;
}

// ============ Debug Stubs ============

export const StepSnapshotStore = {
  getLatest(): any {
    return null;
  },
  setLatest(_snapshot: any): void {},
  appendSnapshot(_snapshot: any): void {},
  getAll(): any[] {
    return [];
  },
  clear(): void {},
};

export const TraceHub = {
  emit(_event: any): void {},
  setContext(_traceId: string, _stepId: string): void {},
  getAll(): any[] {
    return [];
  },
  clear(): void {},
};

// ============ AST Stubs ============

export interface ExpressionAstNode {
  type: string;
  [key: string]: any;
}

export function parseExpression(_latex: string): ExpressionAstNode {
  // Stub: Return a minimal AST
  return {
    type: "stub",
    latex: _latex,
  };
}

export function toLatex(_ast: ExpressionAstNode): string {
  return (_ast as any).latex || "";
}

export function instrumentLatex(latex: string): string {
  // Stub: Return the latex as-is
  return latex;
}
