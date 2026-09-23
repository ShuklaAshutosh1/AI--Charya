import type { BktParameters, PlannerPolicy } from "./types.js";

/**
 * These values are explicit and versioned so they can be calibrated or replaced.
 * They are engineering defaults for the first slice, not scientific validation claims.
 */
export const BKT_CONFIG: BktParameters = {
  version: "bkt-core-v0.2-provisional",
  status: "provisional",
  pInit: 0.35,
  pLearn: 0.15,
  pGuess: 0.2,
  pSlip: 0.1
};

export const PLANNER_POLICY: PlannerPolicy = {
  version: "planner-policy-v0.3-provisional",
  status: "provisional",
  prerequisiteFloor: 0.55,
  secureProbability: 0.85,
  minimumIndependentEvidence: 3,
  independentConfirmations: 3,
  repeatedDifficultyWindow: 2,
  highAssistanceLevel: 4,
  reviewIntervalDays: 14
};
