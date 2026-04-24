import { describe, expect, test } from "vitest";
import { isCorrectSelection, passResult } from "./quiz";

describe("isCorrectSelection", () => {
  test("treats selected and correct option IDs as unordered sets", () => {
    expect(isCorrectSelection(["b", "a"], ["a", "b"])).toBe(true);
  });

  test("rejects missing or extra selected option IDs", () => {
    expect(isCorrectSelection(["a"], ["a", "b"])).toBe(false);
    expect(isCorrectSelection(["a", "b", "c"], ["a", "b"])).toBe(false);
  });
});

describe("passResult", () => {
  test("uses the configured threshold", () => {
    expect(passResult(30, 40, 0.75)).toEqual({
      percentage: 75,
      passed: true,
      thresholdPercentage: 75
    });
    expect(passResult(29, 40, 0.75).passed).toBe(false);
  });
});
