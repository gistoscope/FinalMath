import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runV5Step, V5StepPayload } from "@/lib/api";
import { instrumentLatex } from "@/lib/ast-parser";
import { HintCycle } from "@/lib/hint-cycle";
import { createOperatorContext } from "@/lib/operator-selection-context";
import {
  assertStableIdInjection,
  buildSurfaceNodeMap,
  correlateIntegersWithAST,
  correlateOperatorsWithAST,
  enhanceSurfaceMap,
  getOperandNodes,
  hitTestPoint,
  SurfaceNode,
  SurfaceNodeMap,
} from "@/lib/surface-map";
import katex from "katex";
import "katex/dist/katex.min.css";
import React, { useCallback, useEffect, useRef } from "react";
import { MODE_CONFIG, useVisualizerStore } from "../store";

export function FormulaViewer() {
  const { latex, setLatex, setSurfaceMap, setHintIndicator } =
    useVisualizerStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceMapRef = useRef<SurfaceNodeMap | null>(null);

  // Apply P1 Action
  const applyP1Action = useCallback(async () => {
    const state = HintCycle.getCurrentState();
    const { cycleIndex, stableKey, astNodeId } = state;
    void stableKey;

    if (HintCycle.isApplying()) return;

    let primitiveId = MODE_CONFIG[cycleIndex]?.primitiveId;

    if (cycleIndex === 0) {
      if (!primitiveId) primitiveId = "P.INT_TO_FRAC";
    }

    if (!primitiveId) return;

    HintCycle.setApplying(true);

    try {
      const payload: V5StepPayload = {
        sessionId: "react-session",
        expressionLatex: latex,
        selectionPath: astNodeId || "root",
        preferredPrimitiveId: primitiveId,
        userRole: "student",
        surfaceNodeKind: "Num",
      };

      const result = await runV5Step(
        "http://localhost:4201/api/orchestrator/v5/step",
        payload
      );

      if (
        result.status === "step-applied" &&
        result.engineResult?.newExpressionLatex
      ) {
        setLatex(result.engineResult.newExpressionLatex);
        setHintIndicator(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      HintCycle.setApplying(false);
    }
  }, [latex, setLatex, setHintIndicator]);

  // Handle Integer Click
  const handleIntegerClick = useCallback(
    (node: SurfaceNode, e: React.PointerEvent) => {
      void e;
      const astId = node.astNodeId;
      if (!astId) return;

      const stableKey = `${astId}|Num`;
      const isDoubleClick = HintCycle.wasRecentlyClicked(stableKey, 350);

      if (isDoubleClick) {
        return;
      }

      const current = HintCycle.getCurrentState();

      if (current.stableKey === stableKey) {
        HintCycle.cycleNext();
      } else {
        HintCycle.selectToken(stableKey, node.id, astId);
      }

      const newState = HintCycle.getCurrentState();
      const modeConfig = MODE_CONFIG[newState.cycleIndex];

      setHintIndicator({
        visible: true,
        label: modeConfig.label + " (click to apply)",
        color: modeConfig.color,
        onClick: applyP1Action,
      });
    },
    [applyP1Action, setHintIndicator]
  );

  // Handle Operator Click
  const handleOperatorClick = useCallback((node: SurfaceNode) => {
    if (!surfaceMapRef.current) return;

    const context = createOperatorContext(
      node,
      surfaceMapRef.current,
      getOperandNodes
    );

    // Context created, ready for future use
    if (context) {
      // Operator logic will go here
    }
  }, []);

  // Map Initialization
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const instr = instrumentLatex(latex);
      const html = katex.renderToString(instr.success ? instr.latex : latex, {
        trust: true,
        throwOnError: false,
        strict: false,
      });
      containerRef.current.innerHTML = html;

      const map = buildSurfaceNodeMap(containerRef.current);
      enhanceSurfaceMap(map, containerRef.current);
      correlateIntegersWithAST(map, latex);
      correlateOperatorsWithAST(map, latex);
      assertStableIdInjection(map);

      surfaceMapRef.current = map;
      setSurfaceMap(map); // Save for access by other components if needed

      setHintIndicator(null);
      HintCycle.reset();
    } catch (e) {
      console.error("Render error:", e);
    }
  }, [latex, setSurfaceMap, setHintIndicator]);

  // Event Listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pointer move removed as it was only for debug hover info

    const handlePointerDown = (e: PointerEvent) => {
      if (!surfaceMapRef.current) return;
      const node = hitTestPoint(
        surfaceMapRef.current,
        e.clientX,
        e.clientY,
        container
      );

      if (node) {
        if (node.kind === "Num") {
          handleIntegerClick(node, e as any);
        } else if (
          ["BinaryOp", "MinusBinary", "Relation", "Op"].includes(node.kind)
        ) {
          handleOperatorClick(node);
        }
      }
    };

    // Removed pointermove listener
    container.addEventListener("pointerdown", handlePointerDown);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [handleIntegerClick, handleOperatorClick]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Viewer (KaTeX)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg min-h-[260px] flex items-center justify-center p-8 select-none">
          <div id="formula-container" ref={containerRef} className="text-3xl" />
        </div>
      </CardContent>
    </Card>
  );
}
