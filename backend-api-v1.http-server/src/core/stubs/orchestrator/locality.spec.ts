import { describe, expect, it } from "vitest";
import { getOperatorAnchorPath, isLocalToSelection } from "./locality";

describe("Locality Utils", () => {
  describe("isLocalToSelection", () => {
    it("should return true if paths match", () => {
      expect(isLocalToSelection("p", "p", { targetPath: "p" } as any)).toBe(
        true
      );
    });

    it("should return true if target is root", () => {
      expect(isLocalToSelection("p", "p", { targetPath: "root" } as any)).toBe(
        true
      );
    });

    it("should return false if disjoint", () => {
      expect(isLocalToSelection("a", "a", { targetPath: "b" } as any)).toBe(
        false
      );
    });
  });

  describe("getOperatorAnchorPath", () => {
    it("should return null if not found", () => {
      const getNodeAt = () => null;
      expect(
        getOperatorAnchorPath({}, "path", null, undefined, getNodeAt)
      ).toBeNull();
    });

    it("should return path if it is binaryOp", () => {
      const getNodeAt = () => ({ type: "binaryOp" });
      expect(
        getOperatorAnchorPath({}, "path", "path.op", undefined, getNodeAt)
      ).toBe("path");
    });
  });
});
