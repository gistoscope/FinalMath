import { memo } from "react";
import { useControlBarActions } from "../useControlBarActions";

export const RebuildButton = memo(() => {
  const { handleRebuild } = useControlBarActions();

  return (
    <button id="btn-rebuild" className="primary" onClick={handleRebuild}>
      Rebuild map
    </button>
  );
});
