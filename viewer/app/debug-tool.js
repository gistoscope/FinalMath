// debug-tool.js

// --- State ---
let currentAst = null;

let currentMapResult = null;
let currentStepResult = null;
let els = {};

// --- Initialization ---
export function init() {
    if (typeof document === 'undefined') return;

    // --- DOM Elements ---
    els = {
        latexInput: document.getElementById('latex-input'),
        selectionType: document.getElementById('selection-type'),
        operatorIndex: document.getElementById('operator-index'),
        astPath: document.getElementById('ast-path'),
        mmMode: document.getElementById('mm-mode'),

        groupOpIndex: document.getElementById('group-op-index'),
        groupAstPath: document.getElementById('group-ast-path'),

        btnAstDebug: document.getElementById('btn-ast-debug'),

        btnMapDebug: document.getElementById('btn-map-debug'),
        btnStepDebug: document.getElementById('btn-step-debug'),

        mathPreview: document.getElementById('math-preview'),

        statusEndpoint: document.getElementById('status-endpoint'),
        statusTime: document.getElementById('status-time'),
        statusResult: document.getElementById('status-result'),
        errorMsg: document.getElementById('error-message'),
        errorText: document.getElementById('error-text'),

        astContent: document.getElementById('ast-content'),

        mapContent: document.getElementById('map-content'),
        stepContent: document.getElementById('step-content'),

        loading: document.getElementById('loading-overlay')
    };

    // Event Listeners
    if (els.selectionType) els.selectionType.addEventListener('change', updateSelectionInputs);
    if (els.btnAstDebug) els.btnAstDebug.addEventListener('click', handleAstDebug);

    if (els.btnMapDebug) els.btnMapDebug.addEventListener('click', handleMapDebug);
    if (els.btnStepDebug) els.btnStepDebug.addEventListener('click', handleStepDebug);
    if (els.latexInput) els.latexInput.addEventListener('input', updatePreview);

    // Initial render
    updateSelectionInputs();
    updatePreview();
}

function updateSelectionInputs() {
    if (!els.selectionType) return;
    const type = els.selectionType.value;
    if (type === 'OperatorByIndex') {
        els.groupOpIndex.style.display = 'flex';
        els.groupAstPath.style.display = 'none';
    } else {
        els.groupOpIndex.style.display = 'none';
        els.groupAstPath.style.display = 'flex';
    }
}

function updatePreview() {
    if (!els.latexInput) return;
    const latex = els.latexInput.value;
    if (window.katex && els.mathPreview) {
        try {
            window.katex.render(latex, els.mathPreview, { throwOnError: false });
        } catch (e) {
            els.mathPreview.textContent = 'Error rendering LaTeX';
        }
    } else if (els.mathPreview) {
        els.mathPreview.textContent = latex;
    }
}

function setLoading(isLoading) {
    if (!els.loading) return;
    if (isLoading) {
        els.loading.classList.add('active');
        els.btnAstDebug.disabled = true;

        els.btnMapDebug.disabled = true;
        els.btnStepDebug.disabled = true;
    } else {
        els.loading.classList.remove('active');
        els.btnAstDebug.disabled = false;

        els.btnMapDebug.disabled = false;
        els.btnStepDebug.disabled = false;
    }
}

function updateStatus(endpoint, status, error = null) {
    if (!els.statusEndpoint) return;
    els.statusEndpoint.textContent = endpoint;
    els.statusTime.textContent = new Date().toLocaleTimeString();

    const statusEl = els.statusResult;
    statusEl.textContent = status;
    statusEl.className = 'kv-val';

    if (status === 'ok') {
        statusEl.classList.add('status-ok');
        els.errorMsg.style.display = 'none';
    } else {
        statusEl.classList.add('status-error');
        els.errorMsg.style.display = 'block';
        els.errorText.textContent = error || 'Unknown error';
    }
}

// --- API Calls ---

const DEBUG_API_BASE = "http://localhost:4201";

export async function callAstDebug(latex) {
    const res = await fetch(`${DEBUG_API_BASE}/api/ast-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex })
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function callMapMasterDebug(req) {
    const res = await fetch(`${DEBUG_API_BASE}/api/mapmaster-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function callStepDebug(req) {
    const res = await fetch(`${DEBUG_API_BASE}/api/step-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

// --- Handlers ---

async function handleAstDebug() {
    const latex = els.latexInput.value;
    if (!latex.trim()) {
        alert('Please enter LaTeX');
        return;
    }

    setLoading(true);
    try {
        const response = await callAstDebug(latex);
        if (response.type === 'ok') {
            currentAst = response.ast;
            renderAst(currentAst);
            updateStatus('AST Debug', 'ok');
        } else {
            updateStatus('AST Debug', 'error', response.message);
            els.astContent.innerHTML = `<div style="color:#dc2626">Error: ${response.message}</div>`;
        }
    } catch (e) {
        updateStatus('AST Debug', 'error', e.message);
    } finally {
        setLoading(false);
    }
}

async function handleMapDebug() {
    const latex = els.latexInput.value;
    const selType = els.selectionType.value;
    const mode = els.mmMode.value;

    const selection = {};
    if (selType === 'OperatorByIndex') {
        selection.operatorIndex = parseInt(els.operatorIndex.value, 10);
    } else {
        selection.selectionPath = els.astPath.value;
    }

    setLoading(true);
    try {
        const response = await callMapMasterDebug({ latex, selection, mode });
        if (response.type === 'ok') {
            currentMapResult = response.result;
            // Also update AST view if available
            if (currentMapResult.astSnapshot) {
                currentAst = currentMapResult.astSnapshot;
                renderAst(currentAst);
            }
            renderMapResult(currentMapResult);
            updateStatus('Map Debug', 'ok');
        } else {
            updateStatus('Map Debug', 'error', response.message);
            els.mapContent.innerHTML = `<div style="color:#dc2626">Error: ${response.message}</div>`;
        }
    } catch (e) {
        updateStatus('Map Debug', 'error', e.message);
    } finally {
        setLoading(false);
    }
}

async function handleStepDebug() {
    const latex = els.latexInput.value;
    const selType = els.selectionType.value;
    const mode = els.mmMode.value;

    const selection = {};
    if (selType === 'OperatorByIndex') {
        selection.operatorIndex = parseInt(els.operatorIndex.value, 10);
    } else {
        selection.selectionPath = els.astPath.value;
    }

    setLoading(true);
    try {
        const response = await callStepDebug({ latex, selection, mode });
        if (response.type === 'ok') {
            currentStepResult = response.result;
            // Also update AST view if available
            if (currentStepResult.astSnapshot) {
                currentAst = currentStepResult.astSnapshot;
                renderAst(currentAst);
            }
            renderStepResult(currentStepResult);
            updateStatus('Step Debug', 'ok');
        } else {
            updateStatus('Step Debug', 'error', response.message);
            els.stepContent.innerHTML = `<div style="color:#dc2626">Error: ${response.message}</div>`;
        }
    } catch (e) {
        updateStatus('Step Debug', 'error', e.message);
    } finally {
        setLoading(false);
    }
}

// --- Rendering ---

if (typeof window !== 'undefined') {
    // Global scope for onclick handlers in HTML
    window.switchAstView = (view) => {
        document.querySelectorAll('#ast-content').forEach(el => el.innerHTML = ''); // Clear
        document.querySelectorAll('.col:nth-child(2) .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.col:nth-child(2) .tab[data-view="${view}"]`).classList.add('active');

        if (currentAst) {
            if (view === 'json') {
                renderJson(els.astContent, currentAst);
            } else {
                renderAstTree(els.astContent, currentAst);
            }
        } else {
            els.astContent.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No AST data</div>';
        }
    };

    window.switchMapView = (view) => {
        document.querySelectorAll('#map-content').forEach(el => el.innerHTML = ''); // Clear
        document.querySelectorAll('.col:nth-child(3) .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.col:nth-child(3) .tab[data-view="${view}"]`).classList.add('active');

        if (currentMapResult) {
            if (view === 'json') {
                renderJson(els.mapContent, currentMapResult);
            } else {
                renderMapStructured(els.mapContent, currentMapResult);
            }
        } else {
            els.mapContent.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No MapMaster data</div>';
        }
    };

    window.switchStepView = (view) => {
        document.querySelectorAll('#step-content').forEach(el => el.innerHTML = ''); // Clear
        document.querySelectorAll('.col:nth-child(4) .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.col:nth-child(4) .tab[data-view="${view}"]`).classList.add('active');

        if (currentStepResult) {
            if (view === 'json') {
                renderJson(els.stepContent, currentStepResult);
            } else {
                renderStepStructured(els.stepContent, currentStepResult);
            }
        } else {
            els.stepContent.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 20px;">No StepMaster data</div>';
        }
    };

    // Auto-start
    init();
}

function renderAst(ast) {
    if (typeof window !== 'undefined' && window.switchAstView) {
        window.switchAstView('tree');
    }
}

function renderMapResult(result) {
    if (typeof window !== 'undefined' && window.switchMapView) {
        window.switchMapView('structured');
    }
}

function renderStepResult(result) {
    if (typeof window !== 'undefined' && window.switchStepView) {
        window.switchStepView('structured');
    }
}

function renderJson(container, data) {
    if (!container) return;
    const pre = document.createElement('pre');
    pre.className = 'json-view';
    pre.textContent = JSON.stringify(data, null, 2);
    container.innerHTML = '';
    container.appendChild(pre);
}

function renderAstTree(container, node) {
    if (!container) return;
    container.innerHTML = '';
    const tree = buildTreeElement(node);
    container.appendChild(tree);
}

function buildTreeElement(node) {
    const div = document.createElement('div');
    div.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    const hasChildren = hasChildNodes(node);

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.textContent = hasChildren ? '▼' : '•';
    header.appendChild(toggle);

    const typeSpan = document.createElement('span');
    typeSpan.className = 'node-type';
    typeSpan.textContent = node.type;
    header.appendChild(typeSpan);

    // Show value or op if present
    let val = '';
    if (node.value !== undefined) val = ` ${node.value}`;
    else if (node.op !== undefined) val = ` ${node.op}`;
    else if (node.name !== undefined) val = ` ${node.name}`;

    if (val) {
        const valSpan = document.createElement('span');
        valSpan.className = 'node-value';
        valSpan.textContent = val;
        header.appendChild(valSpan);
    }

    div.appendChild(header);

    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        // Recursively add children
        const children = getChildNodes(node);
        children.forEach(child => {
            childrenContainer.appendChild(buildTreeElement(child));
        });

        div.appendChild(childrenContainer);

        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = childrenContainer.style.display === 'none';
            childrenContainer.style.display = isHidden ? 'block' : 'none';
            toggle.textContent = isHidden ? '▼' : '▶';
        });
    }

    return div;
}

function hasChildNodes(node) {
    if (node.type === 'binaryOp') return true;
    if (node.type === 'fraction') return true;
    if (node.type === 'mixed') return true;
    return false; // integer, variable
}

function getChildNodes(node) {
    if (node.type === 'binaryOp') return [node.left, node.right];
    if (node.type === 'fraction') return [
        { type: 'numerator', value: node.numerator }, // Pseudo-nodes for display
        { type: 'denominator', value: node.denominator }
    ];
    if (node.type === 'mixed') return [
        { type: 'whole', value: node.whole },
        { type: 'numerator', value: node.numerator },
        { type: 'denominator', value: node.denominator }
    ];
    return [];
}

function renderMapStructured(container, result) {
    if (!container) return;
    container.innerHTML = '';
    const p = result.pipeline;

    // Selection
    renderSection(container, 'Selection', [
        { k: 'Status', v: p.selection.status, cls: getStatusClass(p.selection.status) },
        { k: 'Anchor', v: p.selection.anchorNodeId || '-' },
        { k: 'Kind', v: p.selection.anchorKind || '-' },
        { k: 'Trace', v: p.selection.trace || '-' }
    ]);

    // Window
    renderSection(container, 'Window', [
        { k: 'Status', v: p.window.status, cls: getStatusClass(p.window.status) },
        { k: 'Domain', v: p.window.domain || '-' },
        { k: 'Op', v: p.window.operation || '-' },
        { k: 'Nodes', v: p.window.nodeIds ? p.window.nodeIds.join(', ') : '-' }
    ]);

    // Invariants
    renderSection(container, 'Invariants', [
        { k: 'Status', v: p.invariants.status, cls: getStatusClass(p.invariants.status) },
        { k: 'IDs', v: p.invariants.ids ? p.invariants.ids.join(', ') : '-' }
    ]);

    // Rules
    renderSection(container, 'Rules', [
        { k: 'Status', v: p.rules.status, cls: getStatusClass(p.rules.status) },
        { k: 'Count', v: p.rules.candidateCount },
        { k: 'Checked', v: p.rules.checkedInvariantIds ? p.rules.checkedInvariantIds.join(', ') : '-' }
    ]);

    // Candidates
    const candHeader = document.createElement('div');
    candHeader.className = 'section-title';
    candHeader.textContent = `Candidates (${result.candidates.length})`;
    container.appendChild(candHeader);

    if (result.candidates.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = '#9ca3af';
        empty.textContent = 'No candidates generated';
        container.appendChild(empty);
    } else {
        result.candidates.forEach(c => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `
                <div style="font-weight:600; color:#2563eb; margin-bottom:4px;">${c.id}</div>
                <div class="kv-row"><span class="kv-key">Desc:</span> <span class="kv-val">${c.description}</span></div>
                <div class="kv-row"><span class="kv-key">Rule:</span> <span class="kv-val">${c.invariantRuleId}</span></div>
                <div class="kv-row"><span class="kv-key">Prims:</span> <span class="kv-val">${c.primitiveIds.join(', ')}</span></div>
                <div class="kv-row"><span class="kv-key">Target:</span> <span class="kv-val">${c.targetPath}</span></div>
            `;
            container.appendChild(card);
        });
    }
}

function renderSection(container, title, rows) {
    const header = document.createElement('div');
    header.className = 'section-title';
    header.textContent = title;
    container.appendChild(header);

    rows.forEach(row => {
        const div = document.createElement('div');
        div.className = 'kv-row';

        const key = document.createElement('span');
        key.className = 'kv-key';
        key.textContent = row.k + ':';

        const val = document.createElement('span');
        val.className = 'kv-val';
        val.textContent = row.v;
        if (row.cls) val.classList.add(row.cls);

        div.appendChild(key);
        div.appendChild(val);
        container.appendChild(div);
    });
}

function getStatusClass(status) {
    if (status === 'ok' || status === 'found' || status === 'candidates-produced' || status === 'chosen') return 'status-ok';
    if (status === 'error' || status === 'invalid' || status === 'no-anchor') return 'status-error';
    return 'status-warn';
}

function renderStepStructured(container, result) {
    if (!container) return;
    container.innerHTML = '';

    // Decision Summary
    const decision = result.stepMasterOutput.decision;
    const status = decision.status;
    const chosenId = decision.chosenCandidateId;

    renderSection(container, 'Decision', [
        { k: 'Status', v: status, cls: getStatusClass(status) },
        { k: 'Chosen ID', v: chosenId || '-' }
    ]);

    // Primitives
    const primitives = result.stepMasterOutput.primitivesToApply || [];
    const primHeader = document.createElement('div');
    primHeader.className = 'section-title';
    primHeader.textContent = `Primitives (${primitives.length})`;
    container.appendChild(primHeader);

    if (primitives.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = '#9ca3af';
        empty.textContent = 'No primitives';
        container.appendChild(empty);
    } else {
        const ul = document.createElement('ul');
        ul.style.margin = '4px 0';
        ul.style.paddingLeft = '20px';
        primitives.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.id;
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    // Session Info
    if (result.updatedSession) {
        renderSection(container, 'Session', [
            { k: 'Steps', v: result.updatedSession.entries.length },
            { k: 'Last Status', v: result.updatedSession.entries.length > 0 ? result.updatedSession.entries[result.updatedSession.entries.length - 1].decisionStatus : '-' }
        ]);
    }
}
