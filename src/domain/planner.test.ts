import { describe, expect, it } from "vitest";
import {
  FRACTIONS_CONTENT,
  FRACTIONS_FOUNDATIONS_GOAL,
  FRACTIONS_KNOWLEDGE_COMPONENTS
} from "../content/fractions";
import { BKT_CONFIG } from "./config";
import { chooseNextActivity } from "./planner";
import type { EvidenceRecord, LearnerState } from "./types";

const states = (overrides: Partial<Record<string, Partial<LearnerState>>> = {}): LearnerState[] =>
  FRACTIONS_KNOWLEDGE_COMPONENTS.map((component) => ({
    learnerId: "learner",
    knowledgeComponentId: component.id,
    pMastery: 0.72,
    independentEvidenceCount: 1,
    independentCorrectCount: 1,
    modelVersion: BKT_CONFIG.version,
    updatedAt: new Date().toISOString(),
    ...overrides[component.id]
  }));

const evidence = (knowledgeComponentId: string, outcome: EvidenceRecord["outcome"]): EvidenceRecord => ({
  id: crypto.randomUUID(),
  learnerId: "learner",
  sessionId: "session",
  contentItemId: `item-${crypto.randomUUID()}`,
  knowledgeComponentId,
  mode: "learning",
  outcome,
  selectedOptionId: "A",
  firstMeaningfulResponse: true,
  independentScorable: true,
  assistanceUsed: false,
  maxAssistanceLevel: 0,
  responseTimeMs: 2000,
  createdAt: new Date().toISOString()
});

describe("explainable planner", () => {
  it("prioritizes prerequisite repair", () => {
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: states({ "fractions.meaning": { pMastery: 0.3 } }),
      evidence: [],
      usedContentItemIds: []
    });
    expect(decision.reasonCode).toBe("PREREQUISITE_REPAIR");
    expect(decision.knowledgeComponentId).toBe("fractions.meaning");
  });

  it("gathers more evidence when the state is uncertain", () => {
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: states(),
      evidence: [],
      usedContentItemIds: []
    });
    expect(decision.reasonCode).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("progresses to the next connected skill after sufficient secure evidence", () => {
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: states({
        "fractions.meaning": {
          pMastery: 0.94,
          independentEvidenceCount: 2,
          independentCorrectCount: 2
        }
      }),
      evidence: [evidence("fractions.meaning", "correct")],
      usedContentItemIds: []
    });
    expect(decision.reasonCode).toBe("PROGRESSION");
    expect(decision.knowledgeComponentId).toBe("fractions.equivalent");
  });

  it("makes the checkpoint ready only after every skill has sufficient confirmation", () => {
    const secureStates = states(
      Object.fromEntries(
        FRACTIONS_KNOWLEDGE_COMPONENTS.map((component) => [
          component.id,
          { pMastery: 0.94, independentEvidenceCount: 2, independentCorrectCount: 2 }
        ])
      )
    );
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: secureStates,
      evidence: [],
      usedContentItemIds: []
    });
    expect(decision.reasonCode).toBe("CHECKPOINT_READY");
    expect(decision.contentItemId).toBeNull();
  });

  it("prioritizes a learner-requested reassessment and records its reason", () => {
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: states(),
      evidence: [],
      usedContentItemIds: [],
      reassessmentRequests: [{
        id: "request-1",
        learnerId: "learner",
        knowledgeComponentId: "fractions.compare",
        status: "pending",
        note: "Please check this skill again.",
        createdAt: new Date().toISOString()
      }]
    });
    expect(decision.reasonCode).toBe("REASSESSMENT_REQUESTED");
    expect(decision.knowledgeComponentId).toBe("fractions.compare");
    expect(decision.context.reassessmentRequestId).toBe("request-1");
  });

  it("returns an honest unavailable decision instead of reusing exhausted content", () => {
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: states(),
      evidence: [],
      usedContentItemIds: FRACTIONS_CONTENT.filter((item) =>
        item.knowledgeComponentId === "fractions.meaning" && item.modes.includes("learning")
      ).map((item) => item.id)
    });
    expect(decision.reasonCode).toBe("NO_SUITABLE_CONTENT");
    expect(decision.knowledgeComponentId).toBe("fractions.meaning");
  });

  it("schedules review when secure evidence is older than the review interval", () => {
    const secureStates = states(
      Object.fromEntries(
        FRACTIONS_KNOWLEDGE_COMPONENTS.map((component) => [
          component.id,
          {
            pMastery: 0.94,
            independentEvidenceCount: 4,
            independentCorrectCount: 4,
            updatedAt: "2025-01-01T00:00:00.000Z"
          }
        ])
      )
    );
    const decision = chooseNextActivity({
      goal: FRACTIONS_FOUNDATIONS_GOAL,
      knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
      contentItems: FRACTIONS_CONTENT,
      learnerStates: secureStates,
      evidence: [],
      usedContentItemIds: [],
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    expect(decision.reasonCode).toBe("REVIEW_DUE");
  });
});
