import { singleton } from "tsyringe";
import { OP_CHARS, STRUCTURAL_CLASSES } from "../constants";
import type { INodeClassifier } from "../interfaces/IMapEngine";

@singleton()
export class NodeClassifier implements INodeClassifier {
  public isStructural(classes: string[]): boolean {
    return classes.some((cls) => STRUCTURAL_CLASSES.has(cls));
  }

  public classify(
    _element: HTMLElement,
    classes: string[],
    text: string,
  ): { kind: string; role: string; idPrefix: string; atomic: boolean } {
    const t = (text || "").trim();
    const hasDigit = /[0-9]/.test(t);
    const hasGreekChar = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(t);
    const hasAsciiLetter = /[A-Za-z]/.test(t);
    const hasOpChar = this._hasOperatorChar(t);

    if (/^[0-9]+$/.test(t) || /^[0-9]+\.[0-9]+$/.test(t)) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    if (/^[A-Za-z]$/.test(t) || /^[\u0370-\u03FF\u1F00-\u1FFF]$/.test(t)) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    if (t.length === 1 && OP_CHARS.includes(t)) {
      return {
        kind: "BinaryOp",
        role: "operator",
        idPrefix: "op",
        atomic: true,
      };
    }

    if (classes.includes("mbin")) {
      return {
        kind: "BinaryOp",
        role: "operator",
        idPrefix: "op",
        atomic: true,
      };
    }

    if (classes.includes("mrel")) {
      return {
        kind: "Relation",
        role: "operator",
        idPrefix: "rel",
        atomic: true,
      };
    }

    if (["(", "[", "{"].includes(t) || classes.includes("mopen")) {
      return {
        kind: "ParenOpen",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }

    if ([")", "]", "}"].includes(t) || classes.includes("mclose")) {
      return {
        kind: "ParenClose",
        role: "decorator",
        idPrefix: "paren",
        atomic: true,
      };
    }

    if (classes.includes("frac-line")) {
      return {
        kind: "FracBar",
        role: "decorator",
        idPrefix: "fracbar",
        atomic: true,
      };
    }

    if (classes.includes("mfrac")) {
      return {
        kind: "Fraction",
        role: "operator",
        idPrefix: "frac",
        atomic: false,
      };
    }

    if (hasGreekChar) {
      return { kind: "Var", role: "operand", idPrefix: "var", atomic: true };
    }

    if (hasDigit && !hasAsciiLetter && !hasGreekChar && !hasOpChar) {
      return { kind: "Num", role: "operand", idPrefix: "num", atomic: true };
    }

    return { kind: "Other", role: "group", idPrefix: "node", atomic: false };
  }

  private _hasOperatorChar(text: string): boolean {
    const t = text || "";
    for (let i = 0; i < t.length; i++) {
      if (OP_CHARS.includes(t[i])) return true;
    }
    return false;
  }
}
