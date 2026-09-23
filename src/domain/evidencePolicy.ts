import type { ActivityMode, EvidenceRecord } from "./types.js";

export const EVIDENCE_POLICY_VERSION = "evidence-policy-v0.3-provisional";
export const SPACED_REVIEW_INTERVAL_DAYS = 14;

export type EvidencePolicyReason =
  | "ELIGIBLE_INDEPENDENT_RESPONSE"
  | "ELIGIBLE_SPACED_REVIEW"
  | "ASSISTANCE_USED"
  | "SKIPPED_RESPONSE"
  | "PARTIAL_RESPONSE_UNSUPPORTED"
  | "NOT_FIRST_MEANINGFUL_RESPONSE";

export interface EvidencePolicyInput {
  mode: ActivityMode;
  outcome: EvidenceRecord["outcome"];
  assistanceUsed: boolean;
  firstMeaningfulResponse: boolean;
  spacedReview?: boolean;
}

export interface EvidencePolicyDecision {
  independentScorable: boolean;
  updateLearnerModel: boolean;
  applyLearningTransition: boolean;
  reason: EvidencePolicyReason;
}

/**
 * Classifies evidence before it reaches a learner model. The policy is kept
 * separate from BKT so another knowledge tracer can consume the same evidence
 * contract without silently changing educational-integrity rules.
 */
export function classifyEvidence(input: EvidencePolicyInput): EvidencePolicyDecision {
  if (!input.firstMeaningfulResponse) {
    return {
      independentScorable: false,
      updateLearnerModel: false,
      applyLearningTransition: false,
      reason: "NOT_FIRST_MEANINGFUL_RESPONSE"
    };
  }
  if (input.outcome === "skipped") {
    return {
      independentScorable: false,
      updateLearnerModel: false,
      applyLearningTransition: false,
      reason: "SKIPPED_RESPONSE"
    };
  }
  if (input.assistanceUsed) {
    return {
      independentScorable: false,
      updateLearnerModel: false,
      applyLearningTransition: false,
      reason: "ASSISTANCE_USED"
    };
  }
  if (input.outcome === "partial") {
    return {
      independentScorable: false,
      updateLearnerModel: false,
      applyLearningTransition: false,
      reason: "PARTIAL_RESPONSE_UNSUPPORTED"
    };
  }
  return {
    independentScorable: true,
    updateLearnerModel: true,
    // Diagnostic and checkpoint items measure the learner; learning activities
    // may themselves create a learning opportunity.
    applyLearningTransition: input.mode === "learning",
    reason: input.spacedReview ? "ELIGIBLE_SPACED_REVIEW" : "ELIGIBLE_INDEPENDENT_RESPONSE"
  };
}
