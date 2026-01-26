import "katex/dist/katex.min.css";

import { useEffect, useRef, useState } from "react";
import "./App.css";
import { displayAdapter, eventRecorder, fileBus } from "./app/features/engine";

// Components
import JsonInspector from "./components/console/JsonInspector";
import LogConsole from "./components/console/LogConsole";
import ControlToolbar from "./components/controls/ControlToolbar";
import ManualLatexInput from "./components/controls/ManualLatexInput";
import TestSelector from "./components/controls/TestSelector";
import AdvancedDebugTool from "./components/debug/AdvancedDebugTool/AdvancedDebugTool";
import EngineDebugPanel from "./components/debug/EngineDebugPanel";
import HoverDebugPanel from "./components/debug/HoverDebugPanel";
import StepHint from "./components/debug/StepHint";
import TSADebugPanel from "./components/debug/TSADebugPanel";
import Card from "./components/layout/Card";
import Header from "./components/layout/Header";
import MainLayout from "./components/layout/MainLayout";
import FormulaViewer from "./components/viewer/FormulaViewer";

// Hooks
import "./app/features/trace-hub";
import { useViewer } from "./context/ViewerContext";
import { useAppEvents } from "./hooks/useAppEvents";
import { useEngine } from "./hooks/useEngine";
import { useFormulaInteraction } from "./hooks/useFormulaInteraction";

const App: React.FC = () => {
  const { state, actions } = useViewer();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const formulaContainerRef = useRef<HTMLDivElement>(null);

  // Sync ref to state on mount
  useEffect(() => {
    if (formulaContainerRef.current) {
      setContainerEl(formulaContainerRef.current);
    }
  }, []);

  // Phase 4 Hooks: Core Logic
  useEngine();
  useFormulaInteraction({ current: containerEl }, displayAdapter);

  // Initialize App Control Events
  const {
    handleRebuild,
    handleDownloadJson,
    handleDownloadEvents,
    handleDownloadBus,
    handleDownloadSnapshot,
    handleDownloadSession,
    handleResetSession,
    handleLoadLatex,
    handleClearSelection,
  } = useAppEvents(eventRecorder, fileBus);

  // Global Key/Window Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        handleClearSelection();
      }
    };

    const handleResize = () => {
      // Re-triggering state triggers re-render in FormulaViewer
      actions.setLatex(state.formula.latex);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleClearSelection, state.formula.latex, actions]);

  return (
    <MainLayout>
      <Header />

      <div className="layout">
        <Card
          title="Display Viewer (KaTeX)"
          footerNote="Формула рендерится KaTeX, затем строится карта интерактивности по DOM + геометрии."
        >
          <FormulaViewer
            ref={formulaContainerRef}
            latex={state.formula.latex}
          />
          <HoverDebugPanel />
          <StepHint />
          <EngineDebugPanel />
          <TSADebugPanel />
        </Card>

        <Card title="TSA steps log">
          <LogConsole />
        </Card>

        <Card
          title="Surface Node Map JSON"
          footerNote="Это сериализованное дерево SurfaceNodeMap: только семантические узлы (числа, знаки, скобки, дробные черты и т.п.)."
        >
          <div className="controls">
            <TestSelector />
            <ControlToolbar
              onRebuild={handleRebuild}
              onDownloadJson={handleDownloadJson}
              onDownloadEvents={handleDownloadEvents}
              onDownloadBus={handleDownloadBus}
              onDownloadSnapshot={handleDownloadSnapshot}
              onDownloadSession={handleDownloadSession}
              onResetSession={handleResetSession}
              onClearSelection={handleClearSelection}
            />
          </div>

          <ManualLatexInput onLoad={handleLoadLatex} />
          <JsonInspector />
        </Card>

        <Card title="Advanced Debug Tool">
          <AdvancedDebugTool />
        </Card>
      </div>
    </MainLayout>
  );
};

export default App;
