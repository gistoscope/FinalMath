import { PrimitiveRow } from "../../registry/primitives.table";
import { PrimitiveMatch } from "../matcher/matcher.type";

export type SelectedOutcomeKind =
  | "green-primitive"
  | "yellow-scenario"
  | "blue-choice"
  | "red-diagnostic"
  | "no-candidates";

export interface SelectedOutcome {
  kind: SelectedOutcomeKind;
  primitive?: PrimitiveRow;
  matches: PrimitiveMatch[];
}
