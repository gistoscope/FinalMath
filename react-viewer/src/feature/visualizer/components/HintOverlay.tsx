import { useVisualizerStore } from "../store";

export function HintOverlay() {
  const { hintIndicator } = useVisualizerStore();

  if (!hintIndicator || !hintIndicator.visible) return null;

  return (
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
  );
}
