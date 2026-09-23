import { PLANNER_POLICY } from "./config.js";
import type {
  ContentItem,
  EvidenceRecord,
  KnowledgeComponent,
  LearnerState,
  LearningGoal,
  PlannerDecision,
  PlannerReasonCode,
  ReassessmentRequest
} from "./types.js";

export interface PlannerInput {
  goal: LearningGoal;
  knowledgeComponents: KnowledgeComponent[];
  contentItems: ContentItem[];
  learnerStates: LearnerState[];
  evidence: EvidenceRecord[];
  usedContentItemIds: string[];
  reassessmentRequests?: ReassessmentRequest[];
  now?: Date;
}

const explanations: Record<PlannerReasonCode, string> = {
  DIAGNOSTIC_BASELINE: "This quick check helps me understand where to begin.",
  REASSESSMENT_REQUESTED: "You asked for a fresh check of this skill, so we’ll revisit it independently.",
  PREREQUISITE_REPAIR: "Let’s strengthen an earlier idea before moving ahead.",
  INSUFFICIENT_EVIDENCE: "I need one more independent response before making a confident recommendation.",
  REPEATED_DIFFICULTY: "Let’s revisit this idea with more structure before moving on.",
  FLUENCY_DEVELOPMENT: "You understand part of this idea; another varied example will help make it reliable.",
  INDEPENDENT_CONFIRMATION: "Try this independently so we can confirm the skill is secure.",
  PROGRESSION: "Your recent evidence supports moving to the next connected skill.",
  REVIEW_DUE: "This skill is due for a short review to keep it available.",
  CHECKPOINT_READY: "There is enough independent evidence to check the connected skills together.",
  NO_SUITABLE_CONTENT: "There isn’t a suitable reviewed activity available for this need yet."
};

function stateFor(states: LearnerState[], knowledgeComponentId: string): LearnerState {
  const state = states.find((entry) => entry.knowledgeComponentId === knowledgeComponentId);
  if (!state) throw new Error(`Missing learner state for ${knowledgeComponentId}`);
  return state;
}

function recentFor(evidence: EvidenceRecord[], knowledgeComponentId: string): EvidenceRecord[] {
  return evidence
    .filter((entry) => entry.knowledgeComponentId === knowledgeComponentId && entry.mode === "learning")
    .slice(-PLANNER_POLICY.repeatedDifficultyWindow);
}

function selectContent(
  contentItems: ContentItem[],
  knowledgeComponentId: string,
  reasonCode: PlannerReasonCode,
  usedContentItemIds: string[]
): string | null {
  const candidates = contentItems.filter(
    (entry) => entry.knowledgeComponentId === knowledgeComponentId && entry.modes.includes("learning")
  );
  const available = candidates.filter((entry) => !usedContentItemIds.includes(entry.id));
  if (!available.length) return null;

  const activityPreference: Partial<Record<PlannerReasonCode, ContentItem["activityType"][]>> = {
    REASSESSMENT_REQUESTED: ["independent_practice", "review"],
    PREREQUISITE_REPAIR: ["remediation", "guided_practice", "concept_explanation"],
    INSUFFICIENT_EVIDENCE: ["independent_practice", "guided_practice"],
    REPEATED_DIFFICULTY: ["remediation", "guided_practice", "worked_example"],
    FLUENCY_DEVELOPMENT: ["independent_practice", "guided_practice"],
    INDEPENDENT_CONFIRMATION: ["independent_practice", "review"],
    PROGRESSION: ["guided_practice", "concept_explanation", "independent_practice"],
    REVIEW_DUE: ["review", "independent_practice"]
  };
  const difficultyPreference: Partial<Record<PlannerReasonCode, ContentItem["difficulty"][]>> = {
    REASSESSMENT_REQUESTED: ["standard", "stretch", "foundational"],
    PREREQUISITE_REPAIR: ["foundational", "standard", "stretch"],
    INSUFFICIENT_EVIDENCE: ["standard", "foundational", "stretch"],
    REPEATED_DIFFICULTY: ["foundational", "standard", "stretch"],
    FLUENCY_DEVELOPMENT: ["standard", "stretch", "foundational"],
    INDEPENDENT_CONFIRMATION: ["standard", "stretch", "foundational"],
    PROGRESSION: ["foundational", "standard", "stretch"],
    REVIEW_DUE: ["standard", "stretch", "foundational"]
  };
  const preferredActivities = activityPreference[reasonCode] ?? [];
  const preferredDifficulties = difficultyPreference[reasonCode] ?? [];
  return [...available]
    .sort((left, right) => {
      const leftActivity = preferredActivities.indexOf(left.activityType);
      const rightActivity = preferredActivities.indexOf(right.activityType);
      const leftDifficulty = preferredDifficulties.indexOf(left.difficulty);
      const rightDifficulty = preferredDifficulties.indexOf(right.difficulty);
      const leftScore = (leftActivity < 0 ? 99 : leftActivity) * 10 + (leftDifficulty < 0 ? 9 : leftDifficulty);
      const rightScore = (rightActivity < 0 ? 99 : rightActivity) * 10 + (rightDifficulty < 0 ? 9 : rightDifficulty);
      return leftScore - rightScore || left.id.localeCompare(right.id);
    })[0].id;
}

function decision(
  contentItems: ContentItem[],
  reasonCode: PlannerReasonCode,
  knowledgeComponentId: string | null,
  usedContentItemIds: string[],
  context: Record<string, unknown> = {}
): PlannerDecision {
  const contentItemId = knowledgeComponentId
    ? selectContent(contentItems, knowledgeComponentId, reasonCode, usedContentItemIds)
    : null;
  if (knowledgeComponentId && !contentItemId) {
    return {
      reasonCode: "NO_SUITABLE_CONTENT",
      knowledgeComponentId,
      contentItemId: null,
      studentExplanation: explanations.NO_SUITABLE_CONTENT,
      policyVersion: PLANNER_POLICY.version,
      context
    };
  }
  return {
    reasonCode,
    knowledgeComponentId,
    contentItemId,
    studentExplanation: explanations[reasonCode],
    policyVersion: PLANNER_POLICY.version,
    context
  };
}

export function chooseNextActivity(input: PlannerInput): PlannerDecision {
  const ordered = input.knowledgeComponents.filter((component) =>
    input.goal.knowledgeComponentIds.includes(component.id)
  ).sort((a, b) => a.order - b.order);
  const pendingReassessment = input.reassessmentRequests?.find((request) => request.status === "pending");
  if (pendingReassessment) {
    return decision(
      input.contentItems,
      "REASSESSMENT_REQUESTED",
      pendingReassessment.knowledgeComponentId,
      input.usedContentItemIds,
      { reassessmentRequestId: pendingReassessment.id }
    );
  }

  for (const component of ordered) {
    for (const prerequisiteId of component.prerequisites) {
      const prerequisite = stateFor(input.learnerStates, prerequisiteId);
      if (
        prerequisite.independentEvidenceCount > 0 &&
        prerequisite.pMastery < PLANNER_POLICY.prerequisiteFloor
      ) {
        return decision(input.contentItems, "PREREQUISITE_REPAIR", prerequisiteId, input.usedContentItemIds, {
          blockedKnowledgeComponentId: component.id
        });
      }
    }
  }

  const learningEvidence = input.evidence.filter((entry) => entry.mode === "learning");
  const lastEvidence = learningEvidence.at(-1);
  const isComplete = (component: KnowledgeComponent) => {
    const state = stateFor(input.learnerStates, component.id);
    return state.independentEvidenceCount >= PLANNER_POLICY.minimumIndependentEvidence &&
      state.pMastery >= PLANNER_POLICY.secureProbability &&
      state.independentCorrectCount >= PLANNER_POLICY.independentConfirmations;
  };
  const firstUnresolved = ordered.find((component) => !isComplete(component));
  const lastComponent = lastEvidence
    ? ordered.find((component) => component.id === lastEvidence.knowledgeComponentId)
    : undefined;
  const lastIndex = lastComponent ? ordered.indexOf(lastComponent) : -1;
  const unresolvedIndex = firstUnresolved ? ordered.indexOf(firstUnresolved) : -1;
  const progressionTarget = lastComponent && isComplete(lastComponent) && firstUnresolved && unresolvedIndex > lastIndex
    ? firstUnresolved
    : undefined;
  const focus = lastComponent && !isComplete(lastComponent)
    ? lastComponent
    : progressionTarget
      ? undefined
      : firstUnresolved;

  if (focus) {
    const state = stateFor(input.learnerStates, focus.id);
    if (state.independentEvidenceCount < PLANNER_POLICY.minimumIndependentEvidence) {
      return decision(input.contentItems, "INSUFFICIENT_EVIDENCE", focus.id, input.usedContentItemIds, {
        evidenceCount: state.independentEvidenceCount
      });
    }
  }

  for (const component of ordered) {
    const recent = recentFor(input.evidence, component.id);
    const repeatedIncorrect =
      recent.length >= PLANNER_POLICY.repeatedDifficultyWindow &&
      recent.every((entry) => entry.outcome === "incorrect");
    const highAssistance = recent.some(
      (entry) => entry.maxAssistanceLevel >= PLANNER_POLICY.highAssistanceLevel
    );
    if (repeatedIncorrect || highAssistance) {
      return decision(input.contentItems, "REPEATED_DIFFICULTY", component.id, input.usedContentItemIds, {
        repeatedIncorrect,
        highAssistance
      });
    }
  }

  if (focus) {
    const state = stateFor(input.learnerStates, focus.id);
    if (state.pMastery < PLANNER_POLICY.secureProbability) {
      return decision(input.contentItems, "FLUENCY_DEVELOPMENT", focus.id, input.usedContentItemIds, {
        evidenceCount: state.independentEvidenceCount
      });
    }
    if (state.independentCorrectCount < PLANNER_POLICY.independentConfirmations) {
      return decision(input.contentItems, "INDEPENDENT_CONFIRMATION", focus.id, input.usedContentItemIds, {
        independentCorrectCount: state.independentCorrectCount
      });
    }
  }

  if (progressionTarget && lastEvidence) {
      return decision(input.contentItems, "PROGRESSION", progressionTarget.id, input.usedContentItemIds, {
        fromKnowledgeComponentId: lastEvidence.knowledgeComponentId
      });
  }

  const reviewBefore = (input.now ?? new Date()).getTime() - PLANNER_POLICY.reviewIntervalDays * 86_400_000;
  const review = ordered.find((component) => {
    const state = stateFor(input.learnerStates, component.id);
    return state.pMastery >= PLANNER_POLICY.secureProbability && new Date(state.updatedAt).getTime() <= reviewBefore;
  });
  if (review) {
    return decision(input.contentItems, "REVIEW_DUE", review.id, input.usedContentItemIds, {
      reviewIntervalDays: PLANNER_POLICY.reviewIntervalDays
    });
  }

  return decision(input.contentItems, "CHECKPOINT_READY", null, input.usedContentItemIds, {
    eligibleKnowledgeComponents: ordered.map((entry) => entry.id)
  });
}

export function plannerExplanation(reasonCode: PlannerReasonCode): string {
  return explanations[reasonCode];
}
