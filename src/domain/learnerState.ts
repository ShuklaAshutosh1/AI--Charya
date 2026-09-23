import { PLANNER_POLICY } from "./config.js";
import { BKT_LEARNER_MODEL, type LearnerModel } from "./learnerModel.js";
import type { LearnerState, SkillSummary } from "./types.js";

export function initialLearnerState(
  learnerId: string,
  knowledgeComponentId: string,
  model: LearnerModel = BKT_LEARNER_MODEL
): LearnerState {
  return {
    learnerId,
    knowledgeComponentId,
    pMastery: model.initialProbability,
    independentEvidenceCount: 0,
    independentCorrectCount: 0,
    modelVersion: model.version,
    updatedAt: new Date().toISOString()
  };
}

export function summarizeSkill(
  state: LearnerState,
  title: string,
  objective: string
): SkillSummary {
  let status: SkillSummary["status"] = "limited_evidence";
  if (state.independentEvidenceCount >= PLANNER_POLICY.minimumIndependentEvidence) {
    if (state.pMastery >= PLANNER_POLICY.secureProbability) status = "secure";
    else if (state.pMastery >= PLANNER_POLICY.prerequisiteFloor) status = "developing";
    else status = "needs_support";
  }

  const confidence: SkillSummary["confidence"] =
    state.independentEvidenceCount < 2
      ? "limited"
      : state.independentEvidenceCount < 4
        ? "emerging"
        : "supported";

  return {
    id: state.knowledgeComponentId,
    title,
    objective,
    status,
    confidence,
    evidenceCount: state.independentEvidenceCount,
    probability: state.pMastery
  };
}
