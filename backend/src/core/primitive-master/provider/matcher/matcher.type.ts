import { NodeContext } from "../../primitive-master.type";
import { PrimitiveRow } from "../../registry/primitives.table";

export interface PrimitiveMatch {
  row: PrimitiveRow;
  score: number;
  ctx: NodeContext;
}
