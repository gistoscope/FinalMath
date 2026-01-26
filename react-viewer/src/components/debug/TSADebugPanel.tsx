import React from "react";
import {
  formatTsaAstSize,
  formatTsaError,
  formatTsaInvariant,
  formatTsaInvariantText,
  formatTsaOperator,
  formatTsaStrategy,
  formatTsaWindowAfter,
  formatTsaWindowBefore,
} from "../../app/features/debug/formatters";
import { useViewer } from "../../context/ViewerContext";

const TSADebugPanel: React.FC = () => {
  const { state } = useViewer();
  const { tsa } = state.debug;

  return (
    <div id="tsa-debug-panel" className="hover-panel">
      <div className="hover-title">TSA debug</div>
      <div className="hover-line">
        <span className="label">Operator:</span>
        <span id="tsa-debug-operator">{formatTsaOperator(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">Strategy:</span>
        <span id="tsa-debug-strategy">{formatTsaStrategy(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">Invariant:</span>
        <span id="tsa-debug-invariant">{formatTsaInvariant(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">Invariant text:</span>
        <span id="tsa-debug-invariant-text">
          {formatTsaInvariantText(tsa.lastTsa)}
        </span>
      </div>
      <div className="hover-line">
        <span className="label">Window before:</span>
        <span id="tsa-debug-before">{formatTsaWindowBefore(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">Window after:</span>
        <span id="tsa-debug-after">{formatTsaWindowAfter(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">Error:</span>
        <span id="tsa-debug-error">{formatTsaError(tsa.lastTsa)}</span>
      </div>
      <div className="hover-line">
        <span className="label">AST nodes:</span>
        <span id="tsa-debug-ast-size">{formatTsaAstSize(tsa.lastTsa)}</span>
      </div>
    </div>
  );
};

export default TSADebugPanel;
