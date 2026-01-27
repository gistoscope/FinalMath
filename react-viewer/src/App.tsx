import "katex/dist/katex.min.css";
import { useEffect } from "react";
import "./App.css";

// Modern Architecture
import { setupDIContainer } from "./new_app/di/container";
import { EngineBridge } from "./new_app/features/engine-bridge/EngineBridge";
import { useService } from "./new_app/useService";

// Components
import ControlToolbar from "./components/controls/ControlToolbar";
import ManualLatexInput from "./components/controls/ManualLatexInput";
import TestSelector from "./components/controls/TestSelector";
import DiagnosticsPanel from "./components/debug/DiagnosticsPanel";
import Card from "./components/layout/Card";
import Header from "./components/layout/Header";
import MainLayout from "./components/layout/MainLayout";
import FormulaViewer from "./components/viewer/FormulaViewer";

// Store
import { useAppActions } from "./new_app/hooks/useAppActions";
import { useViewerStore } from "./store/useViewerStore";

// Initialize DI Container (Singleton)
setupDIContainer();

const App: React.FC = () => {
  const latex = useViewerStore((state) => state.formula.latex);
  const { setLatex } = useViewerStore((state) => state.actions);

  // Use the actions hook for global handlers
  const { handleClearSelection } = useAppActions();

  // Engine Bridge Management
  const engineBridge = useService<EngineBridge>(EngineBridge);

  useEffect(() => {
    // Start the engine bridge when app mounts
    engineBridge.start();
    return () => {
      engineBridge.stop();
    };
  }, [engineBridge]);

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
          {/* FormulaViewer now manages its own refs and interaction */}
          <FormulaViewer latex={latex} />
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
          {/* <JsonInspector /> */}
        </Card>
      </div>

      <DiagnosticsPanel />
    </MainLayout>
  );
};

export default App;
