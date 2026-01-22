import { Domain } from "domain";
import {
  ClickTarget,
  ExpressionId,
  GuardId,
  NodeId,
  OperandType,
} from "../../primitive-master.type";

export interface NodeContext {
  expressionId: ExpressionId;
  nodeId: NodeId;
  clickTarget: ClickTarget;

  // AST properties
  operatorLatex?: string;
  leftOperandType?: OperandType;
  rightOperandType?: OperandType;

  // Domain properties (optional)
  leftDomain?: Domain;
  rightDomain?: Domain;
  denominatorsEqual?: boolean;
  denominatorsDifferent?: boolean;
  isInsideBrackets?: boolean;

  // Guards
  guards: Record<GuardId, boolean>;

  // Execution Target override (for V5 orchestrator)
  actionNodeId?: string;
}
