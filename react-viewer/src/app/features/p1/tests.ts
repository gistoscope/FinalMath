// features/p1/tests.ts
// P1 Self-test functions

import {
  getCurrentLatex,
  integerCycleState,
  setCurrentLatex,
} from "../../core/state";
import { updateP1Diagnostics } from "../../ui/diagnostics-panel.js";
import { applyIntegerHighlight } from "../../ui/hint-indicator.js";
import { resetIntegerCycleState } from "./cycle-state";
import { applyP1Action } from "./hint-actions.js";

/**
 * P1: Self-test function
 */
export async function runP1SelfTest(
  renderFormula: () => any,
  buildAndShowMap: () => any,
) {
  console.log("[P1-SELF-TEST] Starting self-test...");
  updateP1Diagnostics({ lastTestResult: "RUNNING..." });

  // Save current state
  const originalLatex = getCurrentLatex();

  // Set test expression
  setCurrentLatex("2+3");
  renderFormula();
  const mapResult = buildAndShowMap();
  await new Promise((r) => setTimeout(r, 300));

  const map = mapResult || (window as any).__currentSurfaceMap;
  if (!map || !map.atoms) {
    console.error("[P1-SELF-TEST] FAIL: No surface map available");
    updateP1Diagnostics({ lastTestResult: "FAIL: No surface map" });
    return;
  }

  const firstNum = map.atoms.find((n: any) => n.kind === "Num");
  if (!firstNum) {
    console.error("[P1-SELF-TEST] FAIL: No Num node found");
    updateP1Diagnostics({ lastTestResult: "FAIL: No Num node" });
    return;
  }

  // Select the integer
  integerCycleState.selectedNodeId = firstNum.id;
  integerCycleState.astNodeId = firstNum.astNodeId;
  integerCycleState.cycleIndex = 0; // GREEN mode
  applyIntegerHighlight(firstNum.id, 0, () => {});
  await new Promise((r) => setTimeout(r, 300));

  // Apply P1 action (simulating hint click)
  await applyP1Action(
    firstNum.id,
    firstNum.astNodeId,
    0,
    (newLatex: string) => {
      setCurrentLatex(newLatex);
      renderFormula();
      buildAndShowMap();
    },
  );
  await new Promise((r) => setTimeout(r, 500));

  // Check result
  const expected = "\\frac{2}{1}+3";
  const passed = getCurrentLatex() === expected;

  if (passed) {
    console.log(
      "[P1-SELF-TEST] PASS: Expression correctly converted to",
      getCurrentLatex(),
    );
    updateP1Diagnostics({ lastTestResult: "PASS" });
  } else {
    console.error(
      "[P1-SELF-TEST] FAIL: Expected",
      expected,
      "but got",
      getCurrentLatex(),
    );
    updateP1Diagnostics({ lastTestResult: `FAIL: got "${getCurrentLatex()}"` });
  }

  // Restore original
  setCurrentLatex(originalLatex);
  renderFormula();
  buildAndShowMap();
  resetIntegerCycleState();

  return passed;
}

/**
 * P1 Order-Independence Test
 */
export async function runP1OrderTest(
  order: "left-to-right" | "right-to-left" = "left-to-right",
  renderFormula: () => any,
  buildAndShowMap: () => any,
) {
  console.log(`[P1-ORDER-TEST] Starting order-independence test (${order})...`);

  const originalLatex = getCurrentLatex();
  const results: any[] = [];

  // Set test expression
  setCurrentLatex("2+3-1-1");
  renderFormula();
  const mapResult = buildAndShowMap();
  await new Promise((r) => setTimeout(r, 300));

  const map = mapResult || (window as any).__currentSurfaceMap;
  if (!map || !map.atoms) {
    console.error("[P1-ORDER-TEST] FAIL: No surface map available");
    return { passed: false, error: "No surface map" };
  }

  // Get all Num nodes sorted by position
  let nums = map.atoms.filter((n: any) => n.kind === "Num" && n.astNodeId);
  nums.sort((a: any, b: any) => a.bbox.left - b.bbox.left);

  if (order === "right-to-left") {
    nums = nums.reverse();
  }

  console.log(
    `[P1-ORDER-TEST] Found ${nums.length} integers in ${order} order:`,
  );
  nums.forEach((n: any, i: number) => {
    console.log(
      `  [${i}] surfaceId=${n.id}, astNodeId=${n.astNodeId}, value=${n.latexFragment || n.text}`,
    );
  });

  // Apply INT_TO_FRAC to each integer in order
  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const beforeLatex = getCurrentLatex();

    console.log(
      `[P1-ORDER-TEST] Step ${i + 1}: Applying to ${num.latexFragment || num.text} (astNodeId=${num.astNodeId})`,
    );

    // Select and apply
    integerCycleState.selectedNodeId = num.id;
    integerCycleState.astNodeId = num.astNodeId;
    integerCycleState.cycleIndex = 0;

    await applyP1Action(num.id, num.astNodeId, 0, (newLatex: string) => {
      setCurrentLatex(newLatex);
    });
    await new Promise((r) => setTimeout(r, 400));

    // Record result
    results.push({
      step: i + 1,
      targetValue: num.latexFragment || num.text,
      targetPath: num.astNodeId,
      beforeLatex,
      afterLatex: getCurrentLatex(),
      changed: beforeLatex !== getCurrentLatex(),
    });

    console.log(
      `[P1-ORDER-TEST] Result: "${beforeLatex}" -> "${getCurrentLatex()}"`,
    );

    // Rebuild map for next iteration
    buildAndShowMap();
    await new Promise((r) => setTimeout(r, 200));
  }

  // Summary
  const allChanged = results.every((r) => r.changed);
  console.log(`[P1-ORDER-TEST] === SUMMARY ===`);
  console.log(`[P1-ORDER-TEST] Order: ${order}`);
  console.log(
    `[P1-ORDER-TEST] All steps applied: ${allChanged ? "YES" : "NO"}`,
  );
  console.log(`[P1-ORDER-TEST] Final expression: ${getCurrentLatex()}`);
  results.forEach((r) => {
    console.log(
      `  Step ${r.step}: ${r.targetValue} (${r.targetPath}) -> ${r.changed ? "OK" : "FAILED"}`,
    );
  });

  // Restore
  setCurrentLatex(originalLatex);
  renderFormula();
  buildAndShowMap();
  resetIntegerCycleState();

  return { passed: allChanged, order, results, finalLatex: getCurrentLatex() };
}
