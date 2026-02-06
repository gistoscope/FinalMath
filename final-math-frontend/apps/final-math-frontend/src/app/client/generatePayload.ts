import { SurfaceNode } from '@acme/lre';
import { OrchestratorStepRequest } from '@acme/math-engine';
import { SESSION_ID } from './orchestratorV5Client';

export function generateV5PayloadFromNode(
  node: SurfaceNode,
  fullLatex: string,
): OrchestratorStepRequest {
  return {
    sessionId: SESSION_ID,
    expressionLatex: fullLatex,
    selectionPath: node.astNodeId || null,
    // Use operatorIndex only if we don't have a specific AST ID
    operatorIndex: node.astNodeId ? undefined : node.operatorIndex,
    courseId: 'default',
    userRole: 'student',
    surfaceNodeKind: node.kind || null,
    clickTargetKind: determineClickTargetKind(node) || '',
    operator: node.latexFragment,
    surfaceNodeId: node.id,
  };
}
function determineClickTargetKind(node: SurfaceNode): string | null {
  if (node.role === 'operator') return 'operator';

  if (['Num', 'Number', 'Integer'].includes(node.kind)) return 'number';

  // Note: Your original code checks for 'Fraction', but verify if your node.kind
  // uses 'Fraction' or 'FracBar'.
  if (node.kind === 'Fraction' || node.kind === 'FracBar') return 'fractionBar';

  return null;
}
