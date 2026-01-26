import { eventRecorder, fileBus } from "../../app/features";
import { useAppEvents } from "../../hooks/useAppEvents";

const ControlToolbar = () => {
  const {
    handleRebuild: onRebuild,
    handleDownloadJson: onDownloadJson,
    handleDownloadEvents: onDownloadEvents,
    handleDownloadBus: onDownloadBus,
    handleDownloadSnapshot: onDownloadSnapshot,
    handleDownloadSession: onDownloadSession,
    handleResetSession: onResetSession,
    handleClearSelection: onClearSelection,
  } = useAppEvents(eventRecorder, fileBus);
  return (
    <>
      <button id="btn-rebuild" className="primary" onClick={onRebuild}>
        Rebuild map
      </button>
      <button id="btn-download" className="secondary" onClick={onDownloadJson}>
        Download JSON
      </button>
      <button
        id="btn-download-events"
        className="secondary"
        onClick={onDownloadEvents}
      >
        Download events JSONL
      </button>
      <button
        id="btn-download-bus"
        className="secondary"
        onClick={onDownloadBus}
      >
        Download bus JSONL
      </button>
      <button
        id="btn-download-snapshot"
        className="secondary"
        onClick={onDownloadSnapshot}
      >
        Download Step Snapshot
      </button>
      <button
        id="btn-download-session"
        className="secondary"
        onClick={onDownloadSession}
      >
        Download Session Log
      </button>
      <button
        id="btn-reset-session"
        className="secondary"
        onClick={onResetSession}
      >
        Reset Session Log
      </button>
      <button
        id="btn-clear-selection"
        className="secondary"
        style={{
          background: "#fecaca",
          color: "#7f1d1d",
          border: "1px solid #f87171",
        }}
        onClick={onClearSelection}
      >
        Clear selection
      </button>
    </>
  );
};

export default ControlToolbar;
