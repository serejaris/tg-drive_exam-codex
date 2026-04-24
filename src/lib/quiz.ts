import fs from "node:fs";
import path from "node:path";

export type PassResult = {
  percentage: number;
  passed: boolean;
  thresholdPercentage: number;
};

export type TestRules = {
  questions_per_run: number;
  pass_rule: {
    threshold: number;
  };
};

export function isCorrectSelection(selectedOptionIds: string[], correctOptionIds: string[]): boolean {
  if (selectedOptionIds.length !== correctOptionIds.length) {
    return false;
  }
  const selected = new Set(selectedOptionIds);
  return correctOptionIds.every((optionId) => selected.has(optionId));
}

export function passResult(score: number, total: number, threshold: number): PassResult {
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
  const thresholdPercentage = Math.round(threshold * 100);
  return {
    percentage,
    passed: total > 0 && score / total >= threshold,
    thresholdPercentage
  };
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function readTestRules(): TestRules {
  const rulesPath = path.join(process.cwd(), "data/test_rules.es-ru.json");
  return JSON.parse(fs.readFileSync(rulesPath, "utf8")) as TestRules;
}
