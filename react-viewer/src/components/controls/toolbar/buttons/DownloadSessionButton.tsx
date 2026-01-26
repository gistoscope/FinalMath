import { memo } from "react";
import { useControlBarActions } from "../useControlBarActions";

export const DownloadSessionButton = memo(() => {
  const { handleDownloadSession } = useControlBarActions();

  return (
    <button
      id="btn-download-session"
      className="secondary"
      onClick={handleDownloadSession}
    >
      Download Session Log
    </button>
  );
});
