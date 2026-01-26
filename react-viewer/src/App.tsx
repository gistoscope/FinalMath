import "katex/dist/katex.min.css";
import React from "react";
import "./App.css";

// Components
import { TestSelector } from "./components/controls/test-selector";
import { ControlToolbar } from "./components/controls/toolbar";
import Card from "./components/layout/Card";
import Header from "./components/layout/Header";
import MainLayout from "./components/layout/MainLayout";
import FormulaViewer from "./components/viewer/FormulaViewer";

const App: React.FC = () => {
  return (
    <MainLayout>
      <Header />
      <div className="layout">
        <Card
          title="Display Viewer (KaTeX)"
          footerNote="Формула рендерится KaTeX, затем строится карта интерактивности по DOM + геометрии."
        >
          <FormulaViewer />
        </Card>

        <Card
          title="Surface Node Map JSON"
          footerNote="Это сериализованное дерево SurfaceNodeMap: только семантические узлы (числа, знаки, скобки, дробные черты и т.п.)."
        >
          <div className="controls">
            <TestSelector />
            <ControlToolbar />
          </div>
          {/* <ManualLatexInput /> */}
          {/* <JsonInspector /> */}
        </Card>
      </div>
    </MainLayout>
  );
};

export default App;
