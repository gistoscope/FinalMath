import { memo } from "react";
import { useControlBarActions } from "../useControlBarActions";

export const ClearSelectionButton = memo(() => {
  const { handleClearSelection } = useControlBarActions();

  return (
    <button
      id="btn-clear-selection"
      className="secondary"
      style={{
        background: "#fecaca",
        color: "#7f1d1d",
        border: "1px solid #f87171",
      }}
      onClick={handleClearSelection}
    >
      Clear selection
    </button>
  );
});
