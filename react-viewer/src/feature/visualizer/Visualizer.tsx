import { ControlPanel } from "./components/ControlPanel";
import { FormulaViewer } from "./components/FormulaViewer";
import { HintOverlay } from "./components/HintOverlay";

export function Visualizer() {
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
            <FormulaViewer />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <ControlPanel />
          </div>
        </div>
      </div>

      <HintOverlay />
    </div>
  );
}
