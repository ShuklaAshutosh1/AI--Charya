import { describe, expect, it } from "vitest";
import { updateBkt } from "./bkt";
import { BKT_CONFIG } from "./config";

describe("BKT learner-state update", () => {
  it("increases the estimate after independent correct evidence", () => {
    const update = updateBkt(BKT_CONFIG.pInit, true, BKT_CONFIG);
    expect(update.posteriorAfterLearning).toBeGreaterThan(BKT_CONFIG.pInit);
    expect(update.posteriorAfterLearning).toBeLessThan(1);
  });

  it("reduces the observation estimate after incorrect evidence while applying learning transition", () => {
    const update = updateBkt(0.75, false, BKT_CONFIG);
    expect(update.posteriorAfterObservation).toBeLessThan(0.75);
    expect(update.posteriorAfterLearning).toBeGreaterThan(update.posteriorAfterObservation);
  });

  it("keeps the model configuration explicitly provisional and versioned", () => {
    expect(BKT_CONFIG.status).toBe("provisional");
    expect(BKT_CONFIG.version).toContain("provisional");
  });

  it("can measure knowledge without assuming learning during an assessment", () => {
    const update = updateBkt(BKT_CONFIG.pInit, true, BKT_CONFIG, false);
    expect(update.posteriorAfterLearning).toBe(update.posteriorAfterObservation);
  });
});
