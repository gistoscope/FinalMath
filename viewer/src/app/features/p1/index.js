// features/p1/index.js
// P1 module exports

export { resetIntegerCycleState } from "./cycle-state.js";
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
