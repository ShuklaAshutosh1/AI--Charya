export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type SessionPhase =
  | "diagnostic"
  | "learning"
  | "checkpoint_ready"
  | "checkpoint"
  | "complete";

export type ActivityMode = "diagnostic" | "learning" | "checkpoint";

export type LearningEntryMode = "learn" | "check";

export type DifficultyBand = "foundational" | "standard" | "stretch";

export type PlannerReasonCode =
  | "DIAGNOSTIC_BASELINE"
  | "REASSESSMENT_REQUESTED"
  | "PREREQUISITE_REPAIR"
  | "INSUFFICIENT_EVIDENCE"
  | "REPEATED_DIFFICULTY"
  | "FLUENCY_DEVELOPMENT"
  | "INDEPENDENT_CONFIRMATION"
  | "PROGRESSION"
  | "REVIEW_DUE"
  | "CHECKPOINT_READY"
  | "NO_SUITABLE_CONTENT";

export type HelpKind =
  | "clarify"
  | "known_information"
  | "conceptual_hint"
  | "method_step"
  | "analogous_example"
  | "guided_steps"
  | "complete_solution";

export interface BktParameters {
  version: string;
  status: "provisional" | "validated";
  pInit: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
}

export interface PlannerPolicy {
  version: string;
  status: "provisional" | "validated";
  prerequisiteFloor: number;
  secureProbability: number;
  minimumIndependentEvidence: number;
  independentConfirmations: number;
  repeatedDifficultyWindow: number;
  highAssistanceLevel: number;
  reviewIntervalDays: number;
}

export interface KnowledgeComponent {
  id: string;
  title: string;
  shortTitle: string;
  objective: string;
  prerequisites: string[];
  order: number;
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  grade: Grade;
  context: "independent" | "institutional";
  knowledgeComponentIds: string[];
  curriculumStatus: "candidate_mapping" | "reviewed" | "approved";
  curriculumNote: string;
  contentVersion: string;
}

export interface ContentOption {
  id: string;
  text: string;
}

export interface ContentProvenance {
  authoringSource: string;
  curriculumReference: string;
  reviewStatus: "draft" | "review_required" | "approved";
  version: string;
}

export interface ContentItem {
  id: string;
  knowledgeComponentId: string;
  modes: ActivityMode[];
  type: "single_choice" | "multiple_choice" | "numeric_response" | "constructed_response";
  activityType:
    | "diagnostic_question"
    | "concept_explanation"
    | "worked_example"
    | "guided_practice"
    | "independent_practice"
    | "remediation"
    | "review"
    | "checkpoint_question";
  difficulty: DifficultyBand;
  prompt: string;
  context?: string;
  options: ContentOption[];
  correctOptionId: string;
  explanation: string;
  instruction?: string;
  help: Record<HelpKind, string>;
  assessmentEligible: boolean;
  provenance: ContentProvenance;
}

export interface LearnerState {
  learnerId: string;
  knowledgeComponentId: string;
  pMastery: number;
  independentEvidenceCount: number;
  independentCorrectCount: number;
  modelVersion: string;
  updatedAt: string;
}

export interface EvidenceRecord {
  id: string;
  learnerId: string;
  sessionId: string;
  contentItemId: string;
  knowledgeComponentId: string;
  mode: ActivityMode;
  outcome: "correct" | "incorrect" | "partial" | "skipped";
  selectedOptionId: string | null;
  firstMeaningfulResponse: boolean;
  independentScorable: boolean;
  assistanceUsed: boolean;
  maxAssistanceLevel: number;
  responseTimeMs: number | null;
  createdAt: string;
}

export interface ReassessmentRequest {
  id: string;
  learnerId: string;
  knowledgeComponentId: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  note: string;
  createdAt: string;
}

export interface PlannerDecision {
  reasonCode: PlannerReasonCode;
  knowledgeComponentId: string | null;
  contentItemId: string | null;
  studentExplanation: string;
  policyVersion: string;
  context: Record<string, unknown>;
}

export interface SkillSummary {
  id: string;
  title: string;
  objective: string;
  status: "limited_evidence" | "needs_support" | "developing" | "secure";
  confidence: "limited" | "emerging" | "supported";
  evidenceCount: number;
  probability: number;
}
