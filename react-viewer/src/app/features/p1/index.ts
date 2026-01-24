// features/p1/index.ts
// P1 module exports

export { resetIntegerCycleState } from "./cycle-state";
export {
  applyCurrentHintForStableKey,
  applyP1Action,
  applyP1ActionWithPrimitive,
  ensureP1IntegerContext,
} from "./hint-actions.js";
export {
  handleClientEvent,
  handleIntegerClick,
  setOnHintApplySuccess,
} from "./integer-click-handler.js";
export { runP1OrderTest, runP1SelfTest } from "./tests.js";
