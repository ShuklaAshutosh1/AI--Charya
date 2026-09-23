import { describe, expect, it } from "vitest";
import { classifyEvidence } from "./evidencePolicy";

describe("evidence eligibility policy", () => {
  it("updates the model and applies learning only for independent learning practice", () => {
    expect(classifyEvidence({
      mode: "learning",
      outcome: "correct",
      assistanceUsed: false,
      firstMeaningfulResponse: true
    })).toMatchObject({
      updateLearnerModel: true,
      applyLearningTransition: true,
      reason: "ELIGIBLE_INDEPENDENT_RESPONSE"
    });
  });

  it("does not assume learning during diagnostic or checkpoint observations", () => {
    for (const mode of ["diagnostic", "checkpoint"] as const) {
      expect(classifyEvidence({
        mode,
        outcome: "correct",
        assistanceUsed: false,
        firstMeaningfulResponse: true
      })).toMatchObject({ updateLearnerModel: true, applyLearningTransition: false });
    }
  });

  it("records assisted and skipped responses without updating the model", () => {
    expect(classifyEvidence({
      mode: "learning",
      outcome: "correct",
      assistanceUsed: true,
      firstMeaningfulResponse: true
    })).toMatchObject({ updateLearnerModel: false, reason: "ASSISTANCE_USED" });
    expect(classifyEvidence({
      mode: "learning",
      outcome: "skipped",
      assistanceUsed: false,
      firstMeaningfulResponse: true
    })).toMatchObject({ updateLearnerModel: false, reason: "SKIPPED_RESPONSE" });
  });
});
