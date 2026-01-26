import "katex/dist/katex.min.css";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { displayAdapter, eventRecorder, fileBus } from "./app/features/engine";

// Components
import JsonInspector from "./components/console/JsonInspector";
import ControlToolbar from "./components/controls/ControlToolbar";
import ManualLatexInput from "./components/controls/ManualLatexInput";
import TestSelector from "./components/controls/TestSelector";
import DiagnosticsPanel from "./components/debug/DiagnosticsPanel";
import Card from "./components/layout/Card";
import Header from "./components/layout/Header";
import MainLayout from "./components/layout/MainLayout";
import FormulaViewer from "./components/viewer/FormulaViewer";

// Hooks
import "./app/features/trace-hub";
import { useAppEvents } from "./hooks/useAppEvents";
import { useEngine } from "./hooks/useEngine";
import { useFormulaInteraction } from "./hooks/useFormulaInteraction";
import { useViewerStore } from "./store/useViewerStore";

const App: React.FC = () => {
  const latex = useViewerStore((state) => state.formula.latex);
  const { setLatex } = useViewerStore((state) => state.actions);

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
  const { handleClearSelection } = useAppEvents(eventRecorder, fileBus);

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
      setLatex(latex);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleClearSelection, latex, setLatex]);

  return (
    <MainLayout>
      <Header />

      <div className="layout">
        <Card
          title="Display Viewer (KaTeX)"
          footerNote="Формула рендерится KaTeX, затем строится карта интерактивности по DOM + геометрии."
        >
          <FormulaViewer ref={formulaContainerRef} latex={latex} />
        </Card>

        <Card
          title="Surface Node Map JSON"
          footerNote="Это сериализованное дерево SurfaceNodeMap: только семантические узлы (числа, знаки, скобки, дробные черты и т.п.)."
        >
          <div className="controls">
            <TestSelector />
            <ControlToolbar />
          </div>

          <ManualLatexInput />
          <JsonInspector />
        </Card>
      </div>

      <DiagnosticsPanel />
    </MainLayout>
  );
};

export default App;
