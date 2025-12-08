/**
 * primitives.registry.ts
 *
 * Canonical registry of all atomic primitives in the system.
 * Derived strictly from primitives (5).html.
 *
 * This file is the SINGLE SOURCE OF TRUTH for primitive IDs and definitions.
 */

export type PrimitiveId =
    // A. Normalization
    | "P.DEC_TO_FRAC"
    | "P.MIXED_TO_SUM"
    | "P.INT_TO_FRAC"
    | "P.FRAC_TO_INT"
    | "P.ONE_TO_UNIT_FRAC"
    // B. Integers
    | "P.INT_ADD"
    | "P.INT_SUB"
    | "P.INT_MUL"
    | "P.INT_DIV_TO_FRAC"
    | "P.INT_DIV_TO_INT"
    // C. Fractions
    | "P.FRAC_ADD_SAME_DEN"
    | "P.FRAC_SUB_SAME_DEN"
    | "P.FRAC_MUL"
    | "P.FRAC_DIV_AS_MUL"
    | "P.FRAC_EQ_SCALE"
    // D. Common Denominator
    | "P.FRAC_MUL_BY_ONE"
    | "P.FRAC_LIFT_LEFT_BY_RIGHT_DEN"
    | "P.FRAC_LIFT_RIGHT_BY_LEFT_DEN"
    | "P.FRAC_MUL_UNIT"
    | "P.FRAC_ADD_AFTER_LIFT"
    // E. Signs
    | "P.NEG_BEFORE_NUMBER"
    | "P.NEG_NEG"
    | "P.NEG_DISTRIB_ADD"
    | "P.NEG_DISTRIB_SUB"
    // F. Parentheses
    | "P.PAREN_AROUND_ATOM_INT"
    | "P.PAREN_AROUND_ATOM_FRAC"
    | "P.PAREN_AROUND_EXPR_INT"
    | "P.PAREN_AROUND_EXPR_FRAC"
    // G. Nested Fractions
    | "P.NESTED_FRAC_DIV";

export interface PrimitiveDefinition {
    id: PrimitiveId;
    name: string;
    description: string;
    pattern: string;
    resultPattern: string;
    section: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
    exampleInput: string;
    exampleOutput: string;
}

export const PRIMITIVE_DEFINITIONS: Record<PrimitiveId, PrimitiveDefinition> = {
    // --- A. Normalization ---
    "P.DEC_TO_FRAC": {
        id: "P.DEC_TO_FRAC",
        name: "Decimal to Fraction",
        description: "Convert decimal to fraction",
        pattern: "d",
        resultPattern: "p/q",
        section: "A",
        exampleInput: "1.2",
        exampleOutput: "6/5"
    },
    "P.MIXED_TO_SUM": {
        id: "P.MIXED_TO_SUM",
        name: "Mixed to Sum",
        description: "Convert mixed number to integer + fraction",
        pattern: "a b/c",
        resultPattern: "a + b/c",
        section: "A",
        exampleInput: "2 3/5",
        exampleOutput: "2 + 3/5"
    },
    "P.INT_TO_FRAC": {
        id: "P.INT_TO_FRAC",
        name: "Integer to Fraction",
        description: "Convert integer to fraction with denominator 1",
        pattern: "a",
        resultPattern: "a/1",
        section: "A",
        exampleInput: "3",
        exampleOutput: "3/1"
    },
    "P.FRAC_TO_INT": {
        id: "P.FRAC_TO_INT",
        name: "Fraction to Integer",
        description: "Convert fraction with denominator 1 to integer",
        pattern: "a/1",
        resultPattern: "a",
        section: "A",
        exampleInput: "3/1",
        exampleOutput: "3"
    },
    "P.ONE_TO_UNIT_FRAC": {
        id: "P.ONE_TO_UNIT_FRAC",
        name: "One to Unit Fraction",
        description: "Convert 1 to a/a",
        pattern: "1",
        resultPattern: "a/a",
        section: "A",
        exampleInput: "1",
        exampleOutput: "3/3"
    },

    // --- B. Integers ---
    "P.INT_ADD": {
        id: "P.INT_ADD",
        name: "Integer Addition",
        description: "Add two integers",
        pattern: "a + b",
        resultPattern: "c",
        section: "B",
        exampleInput: "2 + 3",
        exampleOutput: "5"
    },
    "P.INT_SUB": {
        id: "P.INT_SUB",
        name: "Integer Subtraction",
        description: "Subtract two integers",
        pattern: "a - b",
        resultPattern: "c",
        section: "B",
        exampleInput: "2 - 5",
        exampleOutput: "-3"
    },
    "P.INT_MUL": {
        id: "P.INT_MUL",
        name: "Integer Multiplication",
        description: "Multiply two integers",
        pattern: "a * b",
        resultPattern: "c",
        section: "B",
        exampleInput: "2 * 4",
        exampleOutput: "8"
    },
    "P.INT_DIV_TO_FRAC": {
        id: "P.INT_DIV_TO_FRAC",
        name: "Integer Division to Fraction",
        description: "Divide integers to fraction (not exact)",
        pattern: "a : b",
        resultPattern: "a/b",
        section: "B",
        exampleInput: "5 : 2",
        exampleOutput: "5/2"
    },
    "P.INT_DIV_TO_INT": {
        id: "P.INT_DIV_TO_INT",
        name: "Integer Division Exact",
        description: "Divide integers exactly",
        pattern: "a : b",
        resultPattern: "c",
        section: "B",
        exampleInput: "8 : 2",
        exampleOutput: "4"
    },

    // --- C. Fractions ---
    "P.FRAC_ADD_SAME_DEN": {
        id: "P.FRAC_ADD_SAME_DEN",
        name: "Fraction Add Same Denominator",
        description: "Add fractions with same denominator",
        pattern: "a/b + c/b",
        resultPattern: "(a+c)/b",
        section: "C",
        exampleInput: "2/5 + 1/5",
        exampleOutput: "(2+1)/5"
    },
    "P.FRAC_SUB_SAME_DEN": {
        id: "P.FRAC_SUB_SAME_DEN",
        name: "Fraction Sub Same Denominator",
        description: "Subtract fractions with same denominator",
        pattern: "a/b - c/b",
        resultPattern: "(a-c)/b",
        section: "C",
        exampleInput: "3/5 - 1/5",
        exampleOutput: "(3-1)/5"
    },
    "P.FRAC_MUL": {
        id: "P.FRAC_MUL",
        name: "Fraction Multiplication",
        description: "Multiply two fractions",
        pattern: "a/b * c/d",
        resultPattern: "(a*c)/(b*d)",
        section: "C",
        exampleInput: "2/3 * 3/5",
        exampleOutput: "(2*3)/(3*5)"
    },
    "P.FRAC_DIV_AS_MUL": {
        id: "P.FRAC_DIV_AS_MUL",
        name: "Fraction Division as Multiplication",
        description: "Convert division to multiplication by reciprocal",
        pattern: "a/b : c/d",
        resultPattern: "a/b * d/c",
        section: "C",
        exampleInput: "2/3 : 3/5",
        exampleOutput: "2/3 * 5/3"
    },
    "P.FRAC_EQ_SCALE": {
        id: "P.FRAC_EQ_SCALE",
        name: "Fraction Scale by One",
        description: "Multiply fraction by 1",
        pattern: "a/b",
        resultPattern: "a/b * 1",
        section: "C",
        exampleInput: "6/15",
        exampleOutput: "6/15 * 1"
    },

    // --- D. Common Denominator ---
    "P.FRAC_MUL_BY_ONE": {
        id: "P.FRAC_MUL_BY_ONE",
        name: "Fraction Multiply by One",
        description: "Prepare for common denominator",
        pattern: "a/b",
        resultPattern: "a/b * 1",
        section: "D",
        exampleInput: "1/2",
        exampleOutput: "1/2 * 1"
    },
    "P.FRAC_LIFT_LEFT_BY_RIGHT_DEN": {
        id: "P.FRAC_LIFT_LEFT_BY_RIGHT_DEN",
        name: "Lift Left Fraction",
        description: "Multiply left fraction by right denominator/denominator",
        pattern: "a/b",
        resultPattern: "a/b * d/d",
        section: "D",
        exampleInput: "1/2",
        exampleOutput: "1/2 * 3/3"
    },
    "P.FRAC_LIFT_RIGHT_BY_LEFT_DEN": {
        id: "P.FRAC_LIFT_RIGHT_BY_LEFT_DEN",
        name: "Lift Right Fraction",
        description: "Multiply right fraction by left denominator/denominator",
        pattern: "c/d",
        resultPattern: "c/d * b/b",
        section: "D",
        exampleInput: "1/3",
        exampleOutput: "1/3 * 2/2"
    },
    "P.FRAC_MUL_UNIT": {
        id: "P.FRAC_MUL_UNIT",
        name: "Multiply Fraction by Unit Fraction",
        description: "Execute multiplication by k/k",
        pattern: "x/y * k/k",
        resultPattern: "(x*k)/(y*k)",
        section: "D",
        exampleInput: "1/2 * 3/3",
        exampleOutput: "(1*3)/(2*3)"
    },
    "P.FRAC_ADD_AFTER_LIFT": {
        id: "P.FRAC_ADD_AFTER_LIFT",
        name: "Add Fractions After Lift",
        description: "Add fractions that have been lifted to common denominator",
        pattern: "a/b + c/b",
        resultPattern: "(a+c)/b",
        section: "D",
        exampleInput: "3/6 + 2/6",
        exampleOutput: "(3+2)/6"
    },

    // --- E. Signs ---
    "P.NEG_BEFORE_NUMBER": {
        id: "P.NEG_BEFORE_NUMBER",
        name: "Negative Before Number",
        description: "Remove parens around negative number",
        pattern: "-(a)",
        resultPattern: "-a",
        section: "E",
        exampleInput: "-(3)",
        exampleOutput: "-3"
    },
    "P.NEG_NEG": {
        id: "P.NEG_NEG",
        name: "Double Negative",
        description: "Simplify double negative",
        pattern: "-(-a)",
        resultPattern: "a",
        section: "E",
        exampleInput: "-(-4)",
        exampleOutput: "4"
    },
    "P.NEG_DISTRIB_ADD": {
        id: "P.NEG_DISTRIB_ADD",
        name: "Distribute Negative over Addition",
        description: "-(a + b) -> -a - b",
        pattern: "-(a + b)",
        resultPattern: "-a - b",
        section: "E",
        exampleInput: "-(2 + 5)",
        exampleOutput: "-2 - 5"
    },
    "P.NEG_DISTRIB_SUB": {
        id: "P.NEG_DISTRIB_SUB",
        name: "Distribute Negative over Subtraction",
        description: "-(a - b) -> -a + b",
        pattern: "-(a - b)",
        resultPattern: "-a + b",
        section: "E",
        exampleInput: "-(5 - 2)",
        exampleOutput: "-5 + 2"
    },

    // --- F. Parentheses ---
    "P.PAREN_AROUND_ATOM_INT": {
        id: "P.PAREN_AROUND_ATOM_INT",
        name: "Parens Around Integer",
        description: "Remove parens around integer",
        pattern: "(a)",
        resultPattern: "a",
        section: "F",
        exampleInput: "(3)",
        exampleOutput: "3"
    },
    "P.PAREN_AROUND_ATOM_FRAC": {
        id: "P.PAREN_AROUND_ATOM_FRAC",
        name: "Parens Around Fraction",
        description: "Remove parens around fraction",
        pattern: "(a/b)",
        resultPattern: "a/b",
        section: "F",
        exampleInput: "(3/5)",
        exampleOutput: "3/5"
    },
    "P.PAREN_AROUND_EXPR_INT": {
        id: "P.PAREN_AROUND_EXPR_INT",
        name: "Parens Around Integer Expression",
        description: "Remove outer parens from integer expression",
        pattern: "(E_int)",
        resultPattern: "E_int",
        section: "F",
        exampleInput: "(2 + 3)",
        exampleOutput: "2 + 3"
    },
    "P.PAREN_AROUND_EXPR_FRAC": {
        id: "P.PAREN_AROUND_EXPR_FRAC",
        name: "Parens Around Fraction Expression",
        description: "Remove outer parens from fraction expression",
        pattern: "(E_frac)",
        resultPattern: "E_frac",
        section: "F",
        exampleInput: "(1/2 + 1/3)",
        exampleOutput: "1/2 + 1/3"
    },

    // --- G. Nested Fractions ---
    "P.NESTED_FRAC_DIV": {
        id: "P.NESTED_FRAC_DIV",
        name: "Nested Fraction Division",
        description: "Convert nested fraction division to multiplication",
        pattern: "(a/b) / (c/d)",
        resultPattern: "a/b * d/c",
        section: "G",
        exampleInput: "1/2 : 3/4", // Note: The example in HTML uses : but pattern implies nested structure? HTML says "a/b : c/d" in pattern column but "Nested Fraction" title.
        // HTML Pattern: a/b : c/d
        // HTML Result: a/b * d/c
        // HTML Example: 1/2 : 3/4 -> 1/2 * 4/3
        // Wait, the HTML title is "G. Вложенные дроби" (Nested Fractions), but the pattern uses ":".
        // The primitive ID is P.NESTED_FRAC_DIV.
        // I will stick to the HTML pattern "a/b : c/d" for now, but keep in mind it might mean a fraction bar division.
        exampleOutput: "1/2 * 4/3"
    }
};
