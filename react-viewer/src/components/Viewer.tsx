import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import katex from "katex";
import "katex/dist/katex.min.css";
import React, { useCallback, useEffect, useRef, useState } from "react";

// Libs
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
  surfaceMapToSerializable,
  SurfaceNode,
  SurfaceNodeMap,
} from "@/lib/surface-map";

const TESTS = [
  String.raw`\frac{1}{7} + \frac{3}{7}`,
  String.raw`\frac{5}{9} - \frac{2}{9}`,
  String.raw`2+3`,
  String.raw`\frac{1}{3}+\frac{2}{5}`,
  String.raw`\frac{1}{1+\frac{1}{2}}`,
  String.raw`-\left(\frac{3}{4}-\frac{1}{8}\right)`,
  String.raw`12.5 + 0.75 - 3.125`,
  String.raw`1\frac{2}{3} + 2\frac{1}{5}`,
  String.raw`2 + 3 - 1`,
  String.raw`\frac{1}{2} + \frac{1}{3} + \frac{1}{6}`,
  String.raw`\left(1-\frac{1}{3}\right)\cdot\frac{3}{4}`,
  String.raw`\frac{2}{5} - \left(\frac{1}{10}+\frac{3}{20}\right)`,
  String.raw`\left(\frac{1}{2}+\frac{2}{3}\right)-\left(\frac{3}{4}-\frac{1}{5}\right)`,
  String.raw`1.2 + \frac{3}{5} - 0.4`,
  String.raw`\frac{1}{2} + \left(\frac{3}{4} - \frac{1}{1+\frac{1}{2}}\right)`,
  String.raw`\left(\frac{5}{6} - \frac{1}{3}\right) + \frac{7}{8}`,
];

interface ModeConfig {
  mode: number;
  color: string;
  label: string;
  primitiveId: string | null;
}

const MODE_CONFIG: ModeConfig[] = [
  { mode: 0, color: "#4CAF50", label: "Selected", primitiveId: null },
  {
    mode: 1,
    color: "#FF9800",
    label: "Convert to fraction",
    primitiveId: "P.INT_TO_FRAC",
  },
  {
    mode: 2,
    color: "#2196F3",
    label: "Convert 1 → target denom",
    primitiveId: "P.ONE_TO_TARGET_DENOM",
  },
];

interface HintIndicatorState {
  visible: boolean;
  x?: number;
  y?: number;
  label: string;
  color: string;
  onClick: () => void;
}

export function Viewer() {
  const [latex, setLatex] = useState(TESTS[0]);
  const [testIndex, setTestIndex] = useState(0);
  const [jsonMap, setJsonMap] = useState<any>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [clickInfo, setClickInfo] = useState<string | null>(null);
  // Using setEngineDebug temporarily to suppress warning or for future use
  const [engineDebug, setEngineDebug] = useState<any>({});
  void setEngineDebug;
  const [p1Debug, setP1Debug] = useState<any>({});

  // Hint Indicator State
  const [hintIndicator, setHintIndicator] = useState<HintIndicatorState | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceMapRef = useRef<SurfaceNodeMap | null>(null);
  // Remove unused ref
  // const displayAdapterRef = useRef(null);

  // Helper to update P1 debug
  const updateP1Debug = useCallback(
    (updates: any) => {
      setP1Debug((prev: any) => ({ ...prev, ...updates, currentLatex: latex }));
    },
    [latex]
  );

  // Apply P1 Action
  const applyP1Action = useCallback(async () => {
    // Read state from HintCycle
    const state = HintCycle.getCurrentState();
    const { cycleIndex, stableKey, astNodeId } = state;
    void stableKey;

    if (HintCycle.isApplying()) return;

    // Logic from main.js applyCurrentHintForStableKey
    let primitiveId = MODE_CONFIG[cycleIndex]?.primitiveId;

    // Simplify: If user clicks the indicator, we attempt to apply.
    if (cycleIndex === 0) {
      // Green mode - usually just selection. But maybe user wants to apply INT_TO_FRAC anyway?
      // In main.js it blocks unless double-click.
      // We'll allow it if primitiveId is missing, maybe default to INT_TO_FRAC for integer?
      if (!primitiveId) primitiveId = "P.INT_TO_FRAC";
    }

    if (!primitiveId) return;

    HintCycle.setApplying(true);
    updateP1Debug({ lastHintApplyStatus: "RUNNING", primitiveId });

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

      updateP1Debug({
        lastHintApplyStatus: result.status,
        lastHintApplyNewLatex: result.engineResult?.newExpressionLatex,
        lastHintApplyError: result.rawResponse?.error,
      });

      if (
        result.status === "step-applied" &&
        result.engineResult?.newExpressionLatex
      ) {
        setLatex(result.engineResult.newExpressionLatex);
        // Hints cleared on render
        setHintIndicator(null);
      }
    } catch (e) {
      console.error(e);
      updateP1Debug({
        lastHintApplyStatus: "ERROR",
        lastHintApplyError: String(e),
      });
    } finally {
      HintCycle.setApplying(false);
    }
  }, [latex, updateP1Debug]);

  // Handle Hint Cycle Click (on integer)
  const handleIntegerClick = useCallback(
    (node: SurfaceNode, e: React.PointerEvent) => {
      // Logic from main.js applyIntegerHighlight / cycle
      void e;
      const astId = node.astNodeId;
      if (!astId) return;

      const stableKey = `${astId}|Num`;

      // Check double click logic (simplified)
      const isDoubleClick = HintCycle.wasRecentlyClicked(stableKey, 350);

      if (isDoubleClick) {
        // Double click logic -> Apply immediately
        console.log("Double click detected");
        // Force apply logic (similar to applyP1Action but skipping mode check potentially)
        return;
      }

      // Single click -> Select / Cycle
      // If already selected, cycle. Else select.
      const current = HintCycle.getCurrentState();

      if (current.stableKey === stableKey) {
        HintCycle.cycleNext();
      } else {
        HintCycle.selectToken(stableKey, node.id, astId);
      }

      // Show indicator
      const newState = HintCycle.getCurrentState();
      const modeConfig = MODE_CONFIG[newState.cycleIndex];

      setHintIndicator({
        visible: true,
        label: modeConfig.label + " (click to apply)",
        color: modeConfig.color,
        onClick: applyP1Action,
      });

      // Highlight DOM (React way would be better, but we are hacking DOM classes in main.js)
      // We will rely on re-rendering or direct DOM ref manipulation if needed.
      // For now, simpler: just use the indicator.
      updateP1Debug({
        selectedSurfaceNodeId: node.id,
        resolvedAstNodeId: astId,
        primitiveId: modeConfig.primitiveId,
      });
    },
    [applyP1Action, updateP1Debug]
  );

  // Handle Operator Click
  const handleOperatorClick = useCallback(
    (node: SurfaceNode) => {
      if (!surfaceMapRef.current) return;

      const context = createOperatorContext(
        node,
        surfaceMapRef.current,
        getOperandNodes
      );

      if (context) {
        console.log("[Viewer] Operator Context:", context);
        // For now, just show in debug panel
        updateP1Debug({
          selectedSurfaceNodeId: node.id,
          resolvedAstNodeId: node.astNodeId,
          primitiveId: "OPERATOR_CONTEXT", // Placeholder
          lastHintApplyStatus: "OPERATOR_SELECTED",
          // Hacky way to show details in the limited debug panel
          currentLatex: `Op: ${context.operatorSymbol} [${context.astPath}]`,
        });

        // TODO: Highlight visualization using context.leftOperand, context.rightOperand
      }
    },
    [updateP1Debug]
  );

  // Initialize Surface Map
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Render KaTeX
    try {
      // Use instrumentLatex to add IDs if possible
      const instr = instrumentLatex(latex);
      const html = katex.renderToString(instr.success ? instr.latex : latex, {
        trust: true, // Need true for \htmlData
        throwOnError: false,
        strict: false,
      });
      containerRef.current.innerHTML = html;

      // 2. Build Surface Map
      const map = buildSurfaceNodeMap(containerRef.current);
      enhanceSurfaceMap(map, containerRef.current);
      correlateIntegersWithAST(map, latex);
      correlateOperatorsWithAST(map, latex);

      // Assertions
      assertStableIdInjection(map);

      surfaceMapRef.current = map;
      setJsonMap(surfaceMapToSerializable(map));

      // Reset debug
      setHintIndicator(null);
      HintCycle.reset();
      setP1Debug((prev: any) => ({ ...prev, currentLatex: latex }));
    } catch (e) {
      console.error("Render error:", e);
    }
  }, [latex]);

  // Event Listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Note: React's synthetic events are used above, but for global pointer tracking on container,
    // we use native listeners in useEffect to match original logic or if attached non-React way.
    // However, here we mix approaches. Ideally use React props on container.
    // But since buildContextMap traverses DOM, native events are sometimes easier to correlate.
    // Let's stick to native addEventListener for now as in the original code, but typed.

    const handlePointerMove = (e: PointerEvent) => {
      if (!surfaceMapRef.current) return;
      const node = hitTestPoint(
        surfaceMapRef.current,
        e.clientX,
        e.clientY,
        container
      );
      if (node) {
        setHoverInfo(`${node.kind} (${node.id}) ${node.latexFragment}`);
        // Highlight logic could go here
      } else {
        setHoverInfo(null);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!surfaceMapRef.current) return;
      const node = hitTestPoint(
        surfaceMapRef.current,
        e.clientX,
        e.clientY,
        container
      );

      if (node) {
        setClickInfo(`${node.kind} (${node.id})`);

        // Integer Logic
        if (node.kind === "Num") {
          // We need to bridge native event to our handler which expects React.PointerEvent if we were using JSX
          // But our handler actually just uses properties common to both.
          // We cast e to any or act carefully. simpler to just call it.
          handleIntegerClick(node, e as any);
        } else if (
          ["BinaryOp", "MinusBinary", "Relation", "Op"].includes(node.kind)
        ) {
          handleOperatorClick(node);
        }
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerdown", handlePointerDown);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [handleIntegerClick, handleOperatorClick]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <header className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-600">
          <h1 className="text-3xl font-bold mb-1">React Interactive Trainer</h1>
          <p className="text-gray-600">
            Port of SurfaceNodeMap & TSA (NGIN Lite) to React/Vite
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Viewer Card */}
            <Card>
              <CardHeader>
                <CardTitle>Display Viewer (KaTeX)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg min-h-[260px] flex items-center justify-center p-8 select-none">
                  <div
                    id="formula-container"
                    ref={containerRef}
                    className="text-3xl"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Test Case:</label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={testIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      setTestIndex(idx);
                      setLatex(TESTS[idx]);
                    }}
                  >
                    {TESTS.map((t, i) => (
                      <option key={i} value={i}>
                        T{i} · {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setLatex((prev) => prev + " ")}>
                    Rebuild Map
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => console.log(surfaceMapRef.current)}
                  >
                    Log Map to Console
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Manual LaTeX:</label>
                  <div className="flex gap-2">
                    <Textarea
                      value={latex}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setLatex(e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* JSON Output */}
            <Card className="hidden">
              <CardHeader>
                <CardTitle>Surface Map JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-950 text-emerald-200 p-4 rounded-lg font-mono text-xs max-h-[300px] overflow-auto whitespace-pre">
                  {jsonMap ? JSON.stringify(jsonMap, null, 2) : "Building..."}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
        </div>
      </div>

      {/* Hint Indicator Portal/Overlay */}
      {hintIndicator && hintIndicator.visible && (
        <div
          className="fixed bottom-8 right-8 px-6 py-3 rounded-md text-white font-bold cursor-pointer shadow-lg z-50 transition-transform hover:scale-105"
          style={{ backgroundColor: hintIndicator.color }}
          onClick={(e) => {
            e.stopPropagation();
            hintIndicator.onClick();
          }}
        >
          {hintIndicator.label}
        </div>
      )}
    </div>
  );
}
