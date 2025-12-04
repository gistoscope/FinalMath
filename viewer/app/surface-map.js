// surface-map.js
// Строит SurfaceNodeMap по уже отрендеренному KaTeX-HTML.
//
// Модель поверх DOM: нас интересуют только семантические элементы —
// числа, переменные, знаки, скобки, дробные черты и т.п.

function toRelativeBox(el, containerBox) {
  const r = el.getBoundingClientRect();
  return {
    left: r.left - containerBox.left,
    top: r.top - containerBox.top,
    right: r.right - containerBox.left,
    bottom: r.bottom - containerBox.top,
  };
}

function isStructuralClass(className) {
  // Классы, которые используются KaTeX только для верстки,
  // но не несут математического смысла.
  return (
    className === "vlist" ||
    className === "vlist-t" ||
    className === "vlist-r" ||
    className === "vbox" ||
    className === "pstrut" ||
    className === "sizing" ||
    className === "fontsize-ensurer" ||
    className === "mspace"
  );
}

function isStructural(classes) {
  return classes.some(isStructuralClass);
}

function classifyElement(el, classes, text) {
  const t = (text || "").trim();
  const hasDigit = /[0-9]/.test(t);
  const hasGreekChar = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(t);
  const hasAsciiLetter = /[A-Za-z]/.test(t);


  // --- ЧИСЛА И ПЕРЕМЕННЫЕ ---

  // Любая последовательность цифр считаем числом, независимо от KaTeX‑классов.
  if (/^[0-9]+$/.test(t)) {
    return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
  }

  // Десятичные числа вида 12.5, 0.75, 3.125 тоже считаем одним числом.
  if (/^[0-9]+\.[0-9]+$/.test(t)) {
    return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
  }

  // Одиночная латинская буква — переменная.
  if (/^[A-Za-z]$/.test(t)) {
    return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
  }

  // Одиночная греческая буква — тоже переменная.
  if (/^[\u0370-\u03FF\u1F00-\u1FFF]$/.test(t)) {
    return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
  }

  // --- БИНАРНЫЕ ОПЕРАТОРЫ ---

  // Одиночный символ‑оператор.
  // Поддерживаем как ASCII, так и типичные Unicode варианты KaTeX (⋅, ·, ×, −).
  const opChars = "+-−*/:⋅·×";
  if (t.length === 1 && opChars.includes(t)) {
    console.log("[DEBUG] classifyElement found op:", t);
    return { kind: "BinaryOp", role: "operator", idPrefix: "op", atomic: true };
  }

  // Бинарные операторы / отношения по KaTeX‑классам.
  if (classes.includes("mbin")) {
    return { kind: "BinaryOp", role: "operator", idPrefix: "op", atomic: true };
  }
  if (classes.includes("mrel")) {
    return { kind: "Relation", role: "operator", idPrefix: "rel", atomic: true };
  }

  // --- СКОБКИ ---

  // Явные скобки по тексту.
  if (t === "(" || t === "[" || t === "{") {
    return { kind: "ParenOpen", role: "decorator", idPrefix: "paren", atomic: true };
  }
  if (t === ")" || t === "]" || t === "}") {
    return { kind: "ParenClose", role: "decorator", idPrefix: "paren", atomic: true };
  }

  // Скобки по KaTeX‑классам.
  if (classes.includes("mopen")) {
    return { kind: "ParenOpen", role: "decorator", idPrefix: "paren", atomic: true };
  }
  if (classes.includes("mclose")) {
    return { kind: "ParenClose", role: "decorator", idPrefix: "paren", atomic: true };
  }

  // --- ДРОБИ ---

  // Дробная черта.
  if (classes.includes("frac-line")) {
    return { kind: "FracBar", role: "decorator", idPrefix: "fracbar", atomic: true };
  }

  // Контейнер дроби.
  if (classes.includes("mfrac")) {
    return { kind: "Fraction", role: "operator", idPrefix: "frac", atomic: false };
  }

  // --- ОБОБЩЁННАЯ СТРАХОВКА ДЛЯ ЧИСЕЛ И ГРЕЧЕСКИХ БУКВ ---

  // Если в элементе есть греческая буква, а до этого он не был
  // распознан как более специфичный узел — считаем его переменной.
  if (hasGreekChar) {
    return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
  }

  // Если есть хотя бы одна цифра и нет латинских/греческих букв —
  // считаем элемент числом (покрывает "странные" decimal-случаи KaTeX).
  if (hasDigit && !hasAsciiLetter && !hasGreekChar) {
    return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
  }

  // --- ФОЛБЭК ---

  // Всё остальное считаем "группой/контейнером" без собственной атомарности.
  return { kind: "Other", role: "group", idPrefix: "node", atomic: false };
}

function isAtomicKind(kind) {
  return (
    kind === "Num" ||
    kind === "Var" ||
    kind === "BinaryOp" ||
    kind === "Relation" ||
    kind === "ParenOpen" ||
    kind === "ParenClose" ||
    kind === "FracBar"
  );
}

// Основная функция: строит карту узлов
export function buildSurfaceNodeMap(containerElement) {
  const bases = containerElement.querySelectorAll(".katex-html .base");
  const containerBox = containerElement.getBoundingClientRect();

  const atoms = [];
  const byElement = new Map();
  let idCounter = 0;
  const nextId = (prefix) => `${prefix}-${(++idCounter).toString(36)}`;

  const rootNode = {
    id: "root",
    kind: "Root",
    role: "root",
    bbox: {
      left: 0,
      top: 0,
      right: containerBox.width,
      bottom: containerBox.height,
    },
    dom: containerElement,
    latexFragment: "",
    children: [],
    parent: null,
  };

  function traverse(element, parentNode) {
    const classes = Array.from(element.classList || []);
    const text = (element.textContent || "").trim();

    // Прозрачные версточные обертки: не создаем узел, проходим к детям
    if (isStructural(classes)) {
      Array.from(element.children || []).forEach((child) =>
        traverse(child, parentNode)
      );
      return;
    }

    const info = classifyElement(element, classes, text);

    // Элемент без размера не используем как отдельный узел,
    // но продолжаем обходить детей
    const bbox = toRelativeBox(element, containerBox);
    const width = bbox.right - bbox.left;
    const height = bbox.bottom - bbox.top;
    const hasSize = width > 0.5 && height > 0.5;

    // Если это "Other" без текста и/или без размера, считаем его прозрачным
    if (info.kind === "Other" && (!text || !hasSize)) {
      Array.from(element.children || []).forEach((child) =>
        traverse(child, parentNode)
      );
      return;
    }

    // Создаем узел
    const node = {
      id: nextId(info.idPrefix),
      kind: info.kind,
      role: info.role,
      bbox,
      dom: element,
      latexFragment: text,
      children: [],
      parent: parentNode,
    };

    if (parentNode) {
      parentNode.children.push(node);
    }

    byElement.set(element, node);

    // Решаем, добавлять ли узел в список интерактивных атомов.
    // Базовый признак атомарности: либо classifyElement пометил atomic,
    // либо тип узла один из "атомарных" (Num, Var, BinaryOp, Relation, Paren*, FracBar).
    const hasText = (node.latexFragment || "").trim().length > 0;
    const isAtomic = info.atomic || isAtomicKind(node.kind);

    // Для большинства атомов требуем осмысленный текст (символ виден пользователю).
    // Единственное исключение — FracBar: у KaTeX дробная черта не имеет текстового содержимого,
    // но для нас она должна быть кликабельной и интерактивной.
    if (isAtomic) {
      if (node.kind === "FracBar" || hasText) {
        atoms.push(node);
      }
    }

    // Рекурсивно обходим детей уже как потомков этого узла
    Array.from(element.children || []).forEach((child) =>
      traverse(child, node)
    );
  }

  if (bases && bases.length) {
    bases.forEach((b) => traverse(b, rootNode));
  }

  return {
    root: rootNode,
    atoms,
    byElement,
  };
}

// Сериализация карты в JSON-дружелюбный вид
export function surfaceMapToSerializable(map) {
  function toPlain(node) {
    return {
      id: node.id,
      kind: node.kind,
      role: node.role,
      operatorIndex: typeof node.operatorIndex === "number" ? node.operatorIndex : undefined,
      bbox: node.bbox,
      latexFragment: node.latexFragment,
      children: node.children.map(toPlain),
    };
  }

  return {
    root: toPlain(map.root),
  };
}

// Простой hit-test по атомарным узлам.
// clientX/clientY — координаты из PointerEvent/MouseEvent.
export function hitTestPoint(map, clientX, clientY, containerElement) {
  const cbox = containerElement.getBoundingClientRect();
  const x = clientX - cbox.left;
  const y = clientY - cbox.top;

  const candidates = map.atoms.filter((node) => {
    const b = node.bbox;
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  });

  if (candidates.length === 0) return null;

  // выбираем самый "мелкий" по площади — хороший прокси для "самый глубокий"
  candidates.sort((a, b) => {
    const areaA = (a.bbox.right - a.bbox.left) * (a.bbox.bottom - a.bbox.top);
    const areaB = (b.bbox.right - b.bbox.left) * (b.bbox.bottom - b.bbox.top);
    return areaA - areaB;
  });

  return candidates[0];
}

// --- Enhancements: classification refinement & UX helpers ---
/**
 * Post-process the surface map to (1) broaden FracBar hit area,
 * (2) tag greek letters as Var, (3) detect decimals,
 * (4) distinguish unary vs binary minus, (5) mark mixed numbers (Num followed by Fraction).
 * This does not change DOM; it updates node.kind and bbox in-place.
 * @param {{root:any, atoms:any[], byElement:Map}} map
 * @param {HTMLElement} containerEl
 */
export function enhanceSurfaceMap(map, containerEl) {
  if (!map || !Array.isArray(map.atoms)) return map;
  const cbox = containerEl.getBoundingClientRect();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 1) Broaden frac bar hit-zone for easier selection
  for (const n of map.atoms) {
    if (n.kind === "FracBar" && n.bbox) {
      const expand = 3; // px up/down
      n.bbox.top = clamp(n.bbox.top - expand, 0, cbox.height);
      n.bbox.bottom = clamp(n.bbox.bottom + expand, 0, cbox.height);
    }
  }

  // Helpers
  const isGreek = (s) => /[\u0370-\u03FF\u1F00-\u1FFF]/.test((s || "").trim());
  const isDecimal = (s) => /^\d+\.\d+$/.test((s || "").trim());
  const midY = (b) => (b.top + b.bottom) / 2;
  const height = (b) => Math.max(0, b.bottom - b.top);

  // Prepare left-to-right ordering (stable)
  const atomsSorted = [...map.atoms].sort((a, b) => (a.bbox.left - b.bbox.left) || (a.bbox.top - b.bbox.top));

  // 2) Greek as Var, 3) Decimals as Decimal
  for (const n of atomsSorted) {
    const t = (n.latexFragment || "").trim();
    if (isGreek(t)) n.kind = "Var";
    if (isDecimal(t)) n.kind = "Decimal";
  }

  // 4) Unary vs Binary minus (heuristic by nearest left neighbor with vertical overlap)
  for (let i = 0; i < atomsSorted.length; i++) {
    const n = atomsSorted[i];
    const t = (n.latexFragment || "").trim();
    if (t === "-" || t === "−") {
      let prev = null;
      for (let j = i - 1; j >= 0; j--) {
        const p = atomsSorted[j];
        const overlap = Math.min(n.bbox.bottom, p.bbox.bottom) - Math.max(n.bbox.top, p.bbox.top);
        const minH = Math.min(height(n.bbox), height(p.bbox));
        if (overlap > 0.25 * minH) { prev = p; break; }
      }
      const prevIsOperator = !prev || ["BinaryOp", "Relation", "ParenOpen", "FracBar", "Operator"].includes(prev?.kind);
      n.kind = prevIsOperator ? "MinusUnary" : "MinusBinary";
    }
  }

  // 5) Mixed numbers: mark number immediately followed (left-to-right) by a close FracBar on the same baseline as MixedNumber
  for (let i = 0; i < atomsSorted.length; i++) {
    const n = atomsSorted[i];
    if (n.kind === "Num" || n.kind === "Decimal") {
      const right = n.bbox.right;
      const myY = midY(n.bbox);
      const candidate = atomsSorted.find(m =>
        m.kind === "FracBar" &&
        m.bbox.left > right &&
        (m.bbox.left - right) < 22 &&
        m.bbox.top < myY && m.bbox.bottom > myY
      );
      if (candidate) {
        n.kind = "MixedNumber";
        n.meta = Object.assign({}, n.meta || {}, { mixedWithFracBarId: candidate.id });
      }
    }
  }


  // 6) Assign linear operatorIndex to operator-like nodes (for TSA)
  // We consider BinaryOp, MinusBinary, Relation and Fraction as operator slots.
  {
    let opIndex = 0;
    for (const n of atomsSorted) {
      const k = n.kind;
      const isOperatorSlot =
        k === "BinaryOp" ||
        k === "MinusBinary" ||
        k === "Relation" ||
        k === "Fraction";
      if (isOperatorSlot) {
        n.operatorIndex = opIndex++;
      }
    }
  }
  return map;
}
