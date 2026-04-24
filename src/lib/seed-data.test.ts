import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("starter content pack", () => {
  test("ships 40 ES+RU questions and 21 media-backed questions", () => {
    const questionsPath = path.join(process.cwd(), "data/questions.caba.b.starter40.es-ru.json");
    const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8")) as Array<{ media?: unknown }>;

    expect(questions).toHaveLength(40);
    expect(questions.filter((question) => question.media).length).toBe(21);
  });

  test("ships a 75 percent pass threshold", () => {
    const rulesPath = path.join(process.cwd(), "data/test_rules.es-ru.json");
    const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8")) as {
      pass_rule: { threshold: number };
    };

    expect(rules.pass_rule.threshold).toBe(0.75);
  });
});
