import { memo } from "react";
import { useControlBarActions } from "../useControlBarActions";

export const DownloadJsonButton = memo(() => {
  const { handleDownloadJson } = useControlBarActions();

  return (
    <button
      id="btn-download"
      className="secondary"
      onClick={handleDownloadJson}
    >
      Download JSON
    </button>
  );
});
