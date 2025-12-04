/**
 * Карта математического выражения с семантической разметкой
 */
export interface SemanticMap {
    /** Уникальный ID карты */
    id: string;

    /** Исходная формула в LaTeX */
    latex: string;

    /** ID корневого узла */
    rootNodeId: string;

    /** Все узлы дерева выражения */
    nodes: SemanticNode[];

    /** Все доступные действия */
    actions: SemanticAction[];
}

/**
 * Узел дерева выражения
 */
export interface SemanticNode {
    /** Уникальный ID узла в рамках карты */
    id: string;

    /** Путь к узлу в AST (для навигации) */
    path: string;

    /** Синтаксический тип узла */
    syntacticType:
    | 'INT'           // Целое число
    | 'FRACTION'      // Дробь
    | 'SUM'           // Сложение
    | 'DIFFERENCE'    // Вычитание
    | 'PRODUCT'       // Умножение
    | 'DIVISION'      // Деление
    | 'POWER'         // Степень
    | 'SQRT'          // Корень
    | 'PAREN'         // Группировка скобками
    | 'VARIABLE'      // Переменная
    | 'OPERATOR'      // Оператор
    | 'UNKNOWN';      // Неизвестный тип (fallback)

    /** Семантическая роль в выражении */
    role:
    | 'expression_root'      // Корень выражения
    | 'fraction_numerator'   // Числитель дроби
    | 'fraction_denominator' // Знаменатель дроби
    | 'sum_operand'          // Слагаемое
    | 'product_factor'       // Множитель
    | 'power_base'           // Основание степени
    | 'power_exponent'       // Показатель степени
    | 'grouped_expression'   // Выражение в скобках
    | 'standalone_term'      // Отдельный терм
    | 'unknown';             // Неизвестная роль (fallback)

    /** Представление узла в LaTeX */
    latex: string;

    /** ID родительского узла (null для корня) */
    parentId: string | null;

    /** ID дочерних узлов */
    childIds: string[];

    /** ID доступных действий для этого узла */
    actionIds: string[];

    /** ID из источника (DOM ID) */
    sourceId?: string;

    /** Флаги */
    flags: {
        /** Есть ли доступные действия */
        hasActions: boolean;

        /** Можно ли выбрать узел кликом */
        selectable: boolean;
    };
}

/**
 * Действие, которое можно выполнить над узлом
 */
export interface SemanticAction {
    /** Уникальный ID действия */
    id: string;

    /** ID узла, к которому привязано действие */
    targetNodeId: string;

    /** ID примитива */
    primitiveId: string;

    /** ID инварианта */
    invariantId: string;

    /** LaTeX после применения действия */
    resultLatex: string;
}
