/**
 * DebugUI.js
 * Centralized UI rendering logic for the Debug Tool.
 * Handles DOM manipulation and HTML generation.
 */

export const DebugUI = {
  renderAst,
  renderMapResult,
  renderStepResult,
  renderGlobalMapResult,
  renderPrimitiveMapResult,
  updateStatus,
  setLoading,
  updateTargetInfoDisplay,
  updateSelectionInputs,
  updatePreview,
  renderGlassBoxRequest,
  renderGlassBoxResponse,
  renderGlassBoxError,
  renderResolvePathRequest,
  renderResolvePathResponse,
  renderResolvePathError,
  renderTraceHub,

  // Detailed Renderers for Tab Switching
  renderAstTree,
  renderJson,
  renderMapStructured,
  renderStepStructured,
};

// --- Main Renderers ---

function renderAst(container, ast) {
  if (typeof window !== "undefined" && window.switchAstView) {
    window.switchAstView("tree");
  } else if (container) {
    // Fallback if switchAstView is not available
    renderAstTree(container, ast);
  }
}

function renderMapResult(container, result) {
  if (typeof window !== "undefined" && window.switchMapView) {
    window.switchMapView("structured");
  } else if (container) {
    renderMapStructured(container, result);
  }
}

function renderStepResult(container, result) {
  if (typeof window !== "undefined" && window.switchStepView) {
    window.switchStepView("structured");
  } else if (container) {
    renderStepStructured(container, result);
  }
}

function renderGlobalMapResult(container, result) {
  if (!container) return;

  if (!result) {
    container.innerHTML = `
      <div class="section-title">Global Map (full expression)</div>
      <div style="color: #9ca3af; text-align: center; margin-top: 8px;">
        No Global Map data
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  // Summary
  renderSection(container, "Global Map Summary", [
    { k: "Expression", v: result.expressionLatex || "" },
    { k: "Operators", v: String(result.operatorCount ?? 0) },
    {
      k: "Anchors with candidates",
      v: String(result.candidatefulAnchorCount ?? 0),
    },
  ]);

  // Anchors table (compact listing)
  if (Array.isArray(result.entries) && result.entries.length > 0) {
    const header = document.createElement("div");
    header.className = "section-title";
    header.textContent = "Anchors";
    container.appendChild(header);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";
    table.style.marginBottom = "8px";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "OpIdx", "AnchorKind", "Candidates"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.textAlign = "left";
      th.style.padding = "2px 4px";
      th.style.borderBottom = "1px solid #e5e7eb";
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    result.entries.forEach((entry, idx) => {
      const tr = document.createElement("tr");

      const tdIndex = document.createElement("td");
      tdIndex.textContent = String(idx);
      tdIndex.style.padding = "2px 4px";

      const tdOpIdx = document.createElement("td");
      tdOpIdx.textContent =
        entry.operatorIndex != null ? String(entry.operatorIndex) : "-";
      tdOpIdx.style.padding = "2px 4px";

      const tdKind = document.createElement("td");
      tdKind.textContent = entry.anchorKind || "";
      tdKind.style.padding = "2px 4px";

      const tdCount = document.createElement("td");
      tdCount.textContent = String(entry.candidateCount ?? 0);
      tdCount.style.padding = "2px 4px";

      tr.appendChild(tdIndex);
      tr.appendChild(tdOpIdx);
      tr.appendChild(tdKind);
      tr.appendChild(tdCount);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Raw JSON section
  const jsonHeader = document.createElement("div");
  jsonHeader.className = "section-title";
  jsonHeader.textContent = "Raw Global Map JSON";
  container.appendChild(jsonHeader);

  renderJson(container, result);
}

function renderPrimitiveMapResult(container, result) {
  if (!container) return;

  if (!result) {
    container.innerHTML = `
      <div class="section-title">Primitive Map (Stage 1)</div>
      <div style="color: #9ca3af; text-align: center; margin-top: 8px;">
        No Primitive Map data
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  // Summary
  renderSection(container, "Primitive Map Summary", [
    { k: "Expression", v: result.expressionLatex || "" },
    { k: "Stage", v: String(result.stage) },
    { k: "Operators", v: String(result.operatorCount ?? 0) },
    { k: "Ready", v: String(result.readyCount ?? 0), cls: "status-ok" },
    { k: "Blocked", v: String(result.blockedCount ?? 0), cls: "status-warn" },
    { k: "None", v: String(result.noneCount ?? 0), cls: "status-error" },
    { k: "Error", v: String(result.errorCount ?? 0), cls: "status-error" },
  ]);

  // Entries table
  if (Array.isArray(result.entries) && result.entries.length > 0) {
    const header = document.createElement("div");
    header.className = "section-title";
    header.textContent = "Entries";
    container.appendChild(header);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";
    table.style.marginBottom = "8px";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["OpIdx", "NodeID", "Primitive", "Status", "Reason"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.textAlign = "left";
      th.style.padding = "2px 4px";
      th.style.borderBottom = "1px solid #e5e7eb";
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    result.entries.forEach((entry) => {
      const tr = document.createElement("tr");

      const tdOpIdx = document.createElement("td");
      tdOpIdx.textContent =
        entry.operatorIndex != null ? String(entry.operatorIndex) : "-";
      tdOpIdx.style.padding = "2px 4px";

      const tdNodeId = document.createElement("td");
      tdNodeId.textContent = entry.nodeId || "";
      tdNodeId.style.padding = "2px 4px";

      const tdPrim = document.createElement("td");
      tdPrim.textContent = entry.primitiveId || "-";
      tdPrim.style.padding = "2px 4px";
      if (entry.primitiveId) tdPrim.style.color = "#2563eb";

      const tdStatus = document.createElement("td");
      tdStatus.textContent = entry.status || "";
      tdStatus.style.padding = "2px 4px";
      if (entry.status === "ready") tdStatus.className = "status-ok";
      else if (entry.status === "blocked") tdStatus.className = "status-warn";
      else tdStatus.className = "status-error";

      const tdReason = document.createElement("td");
      tdReason.textContent = entry.reason || "";
      tdReason.style.padding = "2px 4px";
      tdReason.style.color = "#6b7280";

      tr.appendChild(tdOpIdx);
      tr.appendChild(tdNodeId);
      tr.appendChild(tdPrim);
      tr.appendChild(tdStatus);
      tr.appendChild(tdReason);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Raw JSON section
  const jsonHeader = document.createElement("div");
  jsonHeader.className = "section-title";
  jsonHeader.textContent = "Raw Primitive Map JSON";
  container.appendChild(jsonHeader);

  renderJson(container, result);
}

// --- Helpers ---

function updateStatus(els, endpoint, status, error = null) {
  if (!els.statusEndpoint) return;
  els.statusEndpoint.textContent = endpoint;
  els.statusTime.textContent = new Date().toLocaleTimeString();

  const statusEl = els.statusResult;
  statusEl.textContent = status;
  statusEl.className = "kv-val";

  if (status === "ok") {
    statusEl.classList.add("status-ok");
    els.errorMsg.style.display = "none";
  } else {
    statusEl.classList.add("status-error");
    els.errorMsg.style.display = "block";
    els.errorText.textContent = error || "Unknown error";
  }
}

function setLoading(els, isLoading) {
  if (!els.loading) return;
  if (isLoading) {
    els.loading.classList.add("active");
    if (els.btnAstDebug) els.btnAstDebug.disabled = true;
    if (els.btnMapDebug) els.btnMapDebug.disabled = true;
    if (els.btnStepDebug) els.btnStepDebug.disabled = true;
  } else {
    els.loading.classList.remove("active");
    if (els.btnAstDebug) els.btnAstDebug.disabled = false;
    if (els.btnMapDebug) els.btnMapDebug.disabled = false;
    if (els.btnStepDebug) els.btnStepDebug.disabled = false;
  }
}

function updateTargetInfoDisplay(lastClickedIntegerTarget) {
  const pathEl = document.getElementById("target-path-display");
  const kindEl = document.getElementById("target-kind-display");
  const surfaceEl = document.getElementById("target-surface-id-display");
  const valueEl = document.getElementById("target-value-display");

  if (lastClickedIntegerTarget) {
    const path = lastClickedIntegerTarget.selectionPath;
    const isNonTargetable = path && path.startsWith("NON_TARGETABLE:");

    if (isNonTargetable) {
      if (pathEl) {
        pathEl.textContent = "❌ " + path.replace("NON_TARGETABLE:", "");
        pathEl.style.color = "#f87171"; // red
      }
      if (kindEl)
        kindEl.textContent =
          lastClickedIntegerTarget.kind + " (NOT TARGETABLE)";
    } else if (path) {
      if (pathEl) {
        pathEl.textContent = path;
        pathEl.style.color = "#22c55e"; // green
      }
      if (kindEl) kindEl.textContent = lastClickedIntegerTarget.kind || "-";
    } else {
      if (pathEl) {
        pathEl.textContent = "null (AST load first)";
        pathEl.style.color = "#f59e0b"; // orange
      }
      if (kindEl) kindEl.textContent = lastClickedIntegerTarget.kind || "-";
    }

    if (surfaceEl)
      surfaceEl.textContent = lastClickedIntegerTarget.surfaceNodeId || "-";
    if (valueEl)
      valueEl.textContent = lastClickedIntegerTarget.latexFragment || "-";
  } else {
    if (pathEl) {
      pathEl.textContent = "-";
      pathEl.style.color = "#fbbf24";
    }
    if (kindEl) kindEl.textContent = "-";
    if (surfaceEl) surfaceEl.textContent = "-";
    if (valueEl) valueEl.textContent = "-";
  }
}

function updateSelectionInputs(els) {
  if (!els.selectionType) return;
  const type = els.selectionType.value;
  if (type === "OperatorByIndex") {
    els.groupOpIndex.style.display = "flex";
    els.groupAstPath.style.display = "none";
  } else {
    els.groupOpIndex.style.display = "none";
    els.groupAstPath.style.display = "flex";
  }
}

function updatePreview(els) {
  if (!els.latexInput) return;
  const latex = els.latexInput.value;
  if (window.katex && els.mathPreview) {
    try {
      window.katex.render(latex, els.mathPreview, { throwOnError: false });
    } catch (e) {
      els.mathPreview.textContent = "Error rendering LaTeX";
    }
  } else if (els.mathPreview) {
    els.mathPreview.textContent = latex;
  }
}

// --- Glass Box Rendering ---

function renderGlassBoxRequest(container, targetSource, endpoint, payload) {
  if (!container) return;
  container.innerHTML = `
<div style="color: #818cf8; font-weight: bold;">📤 REQUEST</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: #22d3ee;">Target Source: ${targetSource}</div>
<div style="color: #fbbf24;">Endpoint: ${endpoint}</div>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #a5f3fc;">${JSON.stringify(payload, null, 2)}</pre>
</div>
<div style="color: #fbbf24;">⏳ Sending request...</div>
    `.trim();
}

function renderGlassBoxResponse(
  container,
  targetSource,
  endpoint,
  payload,
  json,
) {
  if (!container) return;
  const status = json.status || "unknown";
  const statusColor =
    status === "step-applied"
      ? "#22c55e"
      : status === "no-candidates"
        ? "#f59e0b"
        : status.includes("error")
          ? "#ef4444"
          : "#a5f3fc";

  const outputLatex =
    json.engineResult?.newExpressionLatex ||
    json.output?.expressionLatex ||
    "N/A";
  const errorCode = json.engineResult?.errorCode || "";
  const chosenPrimitiveId =
    json.debugInfo?.chosenPrimitiveId || "P.INT_TO_FRAC";

  container.innerHTML = `
<div style="color: #818cf8; font-weight: bold;">📤 REQUEST</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: #22d3ee;">Target Source: ${targetSource}</div>
<div style="color: #fbbf24;">Endpoint: ${endpoint}</div>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #a5f3fc;">${JSON.stringify(payload, null, 2)}</pre>
</div>

<div style="color: #818cf8; font-weight: bold; margin-top: 12px;">📥 RESPONSE</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: ${statusColor}; font-weight: bold;">Status: ${status}</div>
<div style="color: #10b981;">Output LaTeX: <span style="color: #67e8f9;">${outputLatex}</span></div>
${errorCode ? `<div style="color: #ef4444;">Error Code: ${errorCode}</div>` : ""}
<div style="color: #f472b6;">Primitive: <span style="color: #fbbf24;">${chosenPrimitiveId}</span></div>
</div>

<details style="margin-top: 8px;">
<summary style="color: #6b7280; cursor: pointer;">Full Response JSON</summary>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #9ca3af; font-size: 10px; max-height: 300px; overflow: auto;">${JSON.stringify(json, null, 2)}</pre>
</details>

<div style="margin-top: 12px; padding: 8px; background: ${status === "step-applied" ? "#064e3b" : "#7f1d1d"}; border-radius: 4px;">
${
  status === "step-applied"
    ? '✅ <span style="color: #22c55e; font-weight: bold;">SUCCESS: P.INT_TO_FRAC was applied!</span>'
    : status === "no-candidates"
      ? '⚠️ <span style="color: #f59e0b; font-weight: bold;">NO CANDIDATES: No matching candidate found</span>'
      : '❌ <span style="color: #ef4444; font-weight: bold;">ERROR: ' +
        (errorCode || json.error || json.message || "Unknown error") +
        "</span>"
}
</div>
    `.trim();
}

function renderGlassBoxError(container, targetSource, endpoint, payload, err) {
  if (!container) return;
  container.innerHTML = `
<div style="color: #818cf8; font-weight: bold;">📤 REQUEST</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: #22d3ee;">Target Source: ${targetSource}</div>
<div style="color: #fbbf24;">Endpoint: ${endpoint}</div>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #a5f3fc;">${JSON.stringify(payload, null, 2)}</pre>
</div>

<div style="margin-top: 12px; padding: 8px; background: #7f1d1d; border-radius: 4px;">
❌ <span style="color: #ef4444; font-weight: bold;">FETCH ERROR: ${err.message}</span>
<div style="color: #fca5a5; margin-top: 4px; font-size: 10px;">
This usually means the backend is not running or CORS is blocking the request.
</div>
</div>
    `.trim();
}

// --- Resolve Path Rendering ---

function renderResolvePathRequest(container, pathSource, endpoint, payload) {
  if (!container) return;
  container.innerHTML = `
<div style="color: #7c3aed; font-weight: bold;">🔍 RESOLVE PATH</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: #22d3ee;">Path Source: ${pathSource}</div>
<div style="color: #fbbf24;">Endpoint: POST ${endpoint}</div>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #a5f3fc;">${JSON.stringify(payload, null, 2)}</pre>
</div>
<div style="color: #fbbf24;">⏳ Resolving path...</div>
    `.trim();
}

function renderResolvePathResponse(
  container,
  pathSource,
  endpoint,
  payload,
  json,
) {
  if (!container) return;
  const statusColor = json.ok ? "#22c55e" : "#ef4444";
  const statusText = json.ok ? "✅ PATH RESOLVED" : "❌ PATH NOT FOUND";

  container.innerHTML = `
<div style="color: #7c3aed; font-weight: bold;">🔍 RESOLVE PATH</div>
<div style="margin: 8px 0; padding: 8px; background: #1e293b; border-radius: 4px; font-size: 11px;">
<div style="color: #22d3ee;">Path Source: ${pathSource}</div>
<div style="color: #fbbf24;">Endpoint: POST ${endpoint}</div>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #a5f3fc;">${JSON.stringify(payload, null, 2)}</pre>
</div>

<div style="color: ${statusColor}; font-weight: bold; margin: 12px 0;">${statusText}</div>

<div style="margin: 8px 0; padding: 12px; background: ${json.ok ? "#064e3b" : "#7f1d1d"}; border-radius: 4px;">
${
  json.ok
    ? `
<div style="display: grid; gap: 4px; font-size: 12px;">
<div>selectionPath: <span style="color: #fbbf24;">${json.selectionPath}</span></div>
<div>resolvedType: <span style="color: #22d3ee;">${json.resolvedType}</span></div>
<div>resolvedKind: <span style="color: #a78bfa;">${json.resolvedKind}</span></div>
<div>value: <span style="color: #22c55e;">${json.value ?? "null"}</span></div>
<div>latexFragment: <span style="color: #f472b6;">${json.latexFragment ?? "null"}</span></div>
<div style="color: #6b7280; font-size: 10px;">nodeKeys: [${json.nodeKeys?.join(", ") || ""}]</div>
</div>
`
    : `
<div style="color: #fca5a5;">
<div>Error: <span style="color: #fbbf24;">${json.error}</span></div>
<div style="margin-top: 4px;">${json.message}</div>
${json.astRootType ? `<div style="margin-top: 4px; color: #6b7280;">AST root type: ${json.astRootType}</div>` : ""}
</div>
`
}
</div>

<details style="margin-top: 8px;">
<summary style="color: #6b7280; cursor: pointer;">Full Response JSON</summary>
<pre style="margin: 8px 0; white-space: pre-wrap; color: #9ca3af; font-size: 10px; max-height: 200px; overflow: auto;">${JSON.stringify(json, null, 2)}</pre>
</details>
    `.trim();
}

function renderResolvePathError(container, pathSource, endpoint, payload, err) {
  if (!container) return;
  container.innerHTML = `
<div style="color: #7c3aed; font-weight: bold;">🔍 RESOLVE PATH</div>
<div style="margin-top: 12px; padding: 12px; background: #7f1d1d; border-radius: 4px;">
❌ <span style="color: #ef4444; font-weight: bold;">Network Error</span>
<div style="color: #fca5a5; margin-top: 8px;">
${err.message || "Failed to reach backend"}.<br/>
Make sure backend is running at http://localhost:4201 and has been rebuilt.
</div>
</div>
    `.trim();
}

function renderTraceHub(container, data) {
  if (!container) return;
  // Implementation moved from handleTraceHubFetchBackend & updateTraceHubUI logic
  // Just rendering events list
  if (data.events && data.events.length > 0) {
    container.innerHTML = data.events
      .map((ev) => {
        const shortTraceId = ev.traceId ? ev.traceId.substring(0, 8) : "???";
        return `<div style="margin-bottom: 4px; padding: 2px 4px; background: #334155; border-radius: 2px;">
                    <span style="color: #22d3ee;">${shortTraceId}</span> 
                    <span style="color: #a78bfa;">${ev.module}</span>:<span style="color: #4ade80;">${ev.event}</span>
                    <span style="color: #64748b; font-size: 10px;">${ev.ts}</span>
                </div>`;
      })
      .join("");
  } else {
    container.innerHTML = '<div style="color: #64748b;">No trace events.</div>';
  }
}

// --- Internal Render Helpers ---

function renderJson(container, data) {
  if (!container) return;
  const pre = document.createElement("pre");
  pre.className = "json-view";
  pre.textContent = JSON.stringify(data, null, 2);
  container.innerHTML = "";
  container.appendChild(pre);
}

function renderMapStructured(container, result) {
  if (!container) return;
  container.innerHTML = "";
  const p = result.pipeline;

  // Selection
  renderSection(container, "Selection", [
    {
      k: "Status",
      v: p.selection.status,
      cls: getStatusClass(p.selection.status),
    },
    { k: "Anchor", v: p.selection.anchorNodeId || "-" },
    { k: "Kind", v: p.selection.anchorKind || "-" },
    { k: "Trace", v: p.selection.trace || "-" },
  ]);

  // Window
  renderSection(container, "Window", [
    { k: "Status", v: p.window.status, cls: getStatusClass(p.window.status) },
    { k: "Domain", v: p.window.domain || "-" },
    { k: "Op", v: p.window.operation || "-" },
    { k: "Nodes", v: p.window.nodeIds ? p.window.nodeIds.join(", ") : "-" },
  ]);

  // Invariants
  renderSection(container, "Invariants", [
    {
      k: "Status",
      v: p.invariants.status,
      cls: getStatusClass(p.invariants.status),
    },
    { k: "IDs", v: p.invariants.ids ? p.invariants.ids.join(", ") : "-" },
  ]);

  // Rules
  renderSection(container, "Rules", [
    { k: "Status", v: p.rules.status, cls: getStatusClass(p.rules.status) },
    { k: "Count", v: p.rules.candidateCount },
    {
      k: "Checked",
      v: p.rules.checkedInvariantIds
        ? p.rules.checkedInvariantIds.join(", ")
        : "-",
    },
  ]);

  // Candidates
  const candHeader = document.createElement("div");
  candHeader.className = "section-title";
  candHeader.textContent = `Candidates (${result.candidates.length})`;
  container.appendChild(candHeader);

  if (result.candidates.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#9ca3af";
    empty.textContent = "No candidates generated";
    container.appendChild(empty);
  } else {
    result.candidates.forEach((c) => {
      const card = document.createElement("div");
      card.className = "candidate-card";
      card.innerHTML = `
                <div style="font-weight:600; color:#2563eb; margin-bottom:4px;">${c.id}</div>
                <div class="kv-row"><span class="kv-key">Desc:</span> <span class="kv-val">${c.description}</span></div>
                <div class="kv-row"><span class="kv-key">Rule:</span> <span class="kv-val">${c.invariantRuleId}</span></div>
                <div class="kv-row"><span class="kv-key">Prims:</span> <span class="kv-val">${c.primitiveIds.join(", ")}</span></div>
                <div class="kv-row"><span class="kv-key">Target:</span> <span class="kv-val">${c.targetPath}</span></div>
            `;
      container.appendChild(card);
    });
  }
}

function renderStepStructured(container, result) {
  if (!container) return;
  container.innerHTML = "";

  // Decision Summary
  const decision = result.stepMasterOutput.decision;
  const status = decision.status;
  const chosenId = decision.chosenCandidateId;

  renderSection(container, "Decision", [
    { k: "Status", v: status, cls: getStatusClass(status) },
    { k: "Chosen ID", v: chosenId || "-" },
  ]);

  // Primitives
  const primitives = result.stepMasterOutput.primitivesToApply || [];
  const primHeader = document.createElement("div");
  primHeader.className = "section-title";
  primHeader.textContent = `Primitives (${primitives.length})`;
  container.appendChild(primHeader);

  if (primitives.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#9ca3af";
    empty.textContent = "No primitives";
    container.appendChild(empty);
  } else {
    const ul = document.createElement("ul");
    ul.style.margin = "4px 0";
    ul.style.paddingLeft = "20px";
    primitives.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.id;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  // Session Info
  if (result.updatedSession) {
    renderSection(container, "Session", [
      { k: "Steps", v: result.updatedSession.entries.length },
      {
        k: "Last Status",
        v:
          result.updatedSession.entries.length > 0
            ? result.updatedSession.entries[
                result.updatedSession.entries.length - 1
              ].decisionStatus
            : "-",
      },
    ]);
  }

  // Primitive Debug
  const primDebugEl = document.getElementById("step-primitive-debug");
  const primDebugJson = document.getElementById("step-primitive-debug-json");
  if (primDebugEl && primDebugJson) {
    if (result.primitiveDebug) {
      primDebugEl.style.display = "block";
      primDebugJson.textContent = JSON.stringify(
        result.primitiveDebug,
        null,
        2,
      );
    } else {
      primDebugEl.style.display = "none";
    }
  }
}

function renderSection(container, title, rows) {
  const header = document.createElement("div");
  header.className = "section-title";
  header.textContent = title;
  container.appendChild(header);

  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = "kv-row";

    const key = document.createElement("span");
    key.className = "kv-key";
    key.textContent = row.k + ":";

    const val = document.createElement("span");
    val.className = "kv-val";
    val.textContent = row.v;
    if (row.cls) val.classList.add(row.cls);

    div.appendChild(key);
    div.appendChild(val);
    container.appendChild(div);
  });
}

function getStatusClass(status) {
  if (
    status === "ok" ||
    status === "found" ||
    status === "candidates-produced" ||
    status === "chosen"
  )
    return "status-ok";
  if (status === "error" || status === "invalid" || status === "no-anchor")
    return "status-error";
  return "status-warn";
}

function renderAstTree(container, node) {
  if (!container) return;
  container.innerHTML = "";
  const tree = buildTreeElement(node);
  container.appendChild(tree);
}

function buildTreeElement(node) {
  const div = document.createElement("div");
  div.className = "tree-node";

  const header = document.createElement("div");
  header.className = "tree-node-header";

  const hasChildren = hasChildNodes(node);

  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  toggle.textContent = hasChildren ? "▼" : "•";
  header.appendChild(toggle);

  const typeSpan = document.createElement("span");
  typeSpan.className = "node-type";
  typeSpan.textContent = node.type;
  header.appendChild(typeSpan);

  // Show value or op if present
  let val = "";
  if (node.value !== undefined) val = ` ${node.value}`;
  else if (node.op !== undefined) val = ` ${node.op}`;
  else if (node.name !== undefined) val = ` ${node.name}`;

  if (val) {
    const valSpan = document.createElement("span");
    valSpan.className = "node-value";
    valSpan.textContent = val;
    header.appendChild(valSpan);
  }

  div.appendChild(header);

  if (hasChildren) {
    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    // Recursively add children
    const children = getChildNodes(node);
    children.forEach((child) => {
      childrenContainer.appendChild(buildTreeElement(child));
    });

    div.appendChild(childrenContainer);

    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = childrenContainer.style.display === "none";
      childrenContainer.style.display = isHidden ? "block" : "none";
      toggle.textContent = isHidden ? "▼" : "▶";
    });
  }

  return div;
}

function hasChildNodes(node) {
  if (node.type === "binaryOp") return true;
  if (node.type === "fraction") return true;
  if (node.type === "mixed") return true;
  return false; // integer, variable
}

function getChildNodes(node) {
  if (node.type === "binaryOp") return [node.left, node.right];
  if (node.type === "fraction")
    return [
      { type: "numerator", value: node.numerator }, // Pseudo-nodes for display
      { type: "denominator", value: node.denominator },
    ];
  if (node.type === "mixed")
    return [
      { type: "whole", value: node.whole },
      { type: "numerator", value: node.numerator },
      { type: "denominator", value: node.denominator },
    ];
  return [];
}
