import { describe, expect, it } from "vitest";
import { FRACTIONS_CONTENT } from "./fractions";

function fractionValue(text: string): number | null {
  const match = text.trim().match(/^(-?\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const denominator = Number(match[2]);
  return denominator === 0 ? null : Number(match[1]) / denominator;
}

describe("Fractions content quality gates", () => {
  it("has exactly one declared correct option for every seeded item", () => {
    for (const item of FRACTIONS_CONTENT) {
      expect(item.options.filter((option) => option.id === item.correctOptionId)).toHaveLength(1);
      expect(new Set(item.options.map((option) => option.id)).size).toBe(item.options.length);
      expect(new Set(item.options.map((option) => option.text)).size).toBe(item.options.length);
    }
  });

  it("does not place mathematically equivalent fraction choices in a single-answer item", () => {
    for (const item of FRACTIONS_CONTENT) {
      const numericFractions = item.options
        .map((option) => ({ id: option.id, value: fractionValue(option.text) }))
        .filter((option): option is { id: string; value: number } => option.value !== null);
      for (let left = 0; left < numericFractions.length; left += 1) {
        for (let right = left + 1; right < numericFractions.length; right += 1) {
          expect(
            Math.abs(numericFractions[left].value - numericFractions[right].value),
            `${item.id} contains equivalent choices ${numericFractions[left].id} and ${numericFractions[right].id}`
          ).toBeGreaterThan(1e-10);
        }
      }
    }
  });

  it("keeps every seed item behind content review", () => {
    expect(FRACTIONS_CONTENT.every((item) => item.provenance.reviewStatus === "review_required")).toBe(true);
  });
});
