import { memo } from "react";
import { useControlBarActions } from "../useControlBarActions";

export const ResetSessionButton = memo(() => {
  const { handleResetSession } = useControlBarActions();

  return (
    <button
      id="btn-reset-session"
      className="secondary"
      onClick={handleResetSession}
    >
      Reset Session Log
    </button>
  );
});
