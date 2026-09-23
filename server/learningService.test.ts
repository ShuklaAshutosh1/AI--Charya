import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getContentItem } from "../src/content/fractions";
import { BKT_CONFIG } from "../src/domain/config";
import type { LearnerModel } from "../src/domain/learnerModel";
import { createDatabase, type AppDatabase } from "./database";
import { LearningService } from "./learningService";

describe("complete adaptive learning slice", () => {
  let database: AppDatabase;
  let service: LearningService;

  beforeEach(() => {
    database = createDatabase(":memory:");
    service = new LearningService(database);
  });

  afterEach(() => database.close());

  it("moves from diagnostic through real planner decisions to a completed checkpoint", () => {
    const learner = service.createLearner({ name: "Ananya", grade: 6 });
    let session = service.startGoal(learner.id, "math-g6-fractions-foundations");

    while (session.phase === "diagnostic") {
      const content = getContentItem(session.activity!.id);
      const response = service.respond(session.id, { selectedOptionId: content.correctOptionId });
      expect(response.contributedToModel).toBe(true);
      session = service.next(session.id);
    }

    expect(session.phase).toBe("learning");
    expect(session.reason.code).toBe("INSUFFICIENT_EVIDENCE");

    const plannerReasons: string[] = [];
    while (session.phase === "learning") {
      plannerReasons.push(session.reason.code);
      const content = getContentItem(session.activity!.id);
      const response = service.respond(session.id, { selectedOptionId: content.correctOptionId });
      expect("posterior" in response.modelUpdate).toBe(true);
      if ("posterior" in response.modelUpdate) {
        expect(response.modelUpdate.posterior).toBeGreaterThan(response.modelUpdate.prior);
      }
      session = service.next(session.id);
    }

    expect(plannerReasons).toContain("PROGRESSION");
    expect(session.phase).toBe("checkpoint_ready");

    session = service.startCheckpoint(session.id);
    while (session.phase === "checkpoint") {
      const content = getContentItem(session.activity!.id);
      service.respond(session.id, { selectedOptionId: content.correctOptionId });
      session = service.next(session.id);
    }

    expect(session.phase).toBe("complete");
    const progress = service.getProgress(learner.id);
    expect(progress.evidenceSummary.completedSessions).toBe(1);
    expect(progress.skills.every((skill) => skill.status === "secure")).toBe(true);
  });

  it("stores assistance separately and excludes an assisted response from BKT", async () => {
    const learner = service.createLearner({ name: "Kabir", grade: 6 });
    let session = service.startGoal(learner.id, "math-g6-fractions-foundations");

    while (session.phase === "diagnostic") {
      const content = getContentItem(session.activity!.id);
      service.respond(session.id, { selectedOptionId: content.correctOptionId });
      session = service.next(session.id);
    }

    const before = session.skills.find(
      (skill: any) => skill.id === session.activity!.knowledgeComponent!.id
    )!;
    const assistance = await service.requestAssistance(session.id, "method_step");
    expect(assistance.educationalIntegrity.bktUpdateEligible).toBe(false);
    const content = getContentItem(session.activity!.id);
    const response = service.respond(session.id, { selectedOptionId: content.correctOptionId });
    expect(response.contributedToModel).toBe(false);

    const after = service.getSession(session.id).skills.find(
      (skill: any) => skill.id === session.activity!.knowledgeComponent!.id
    )!;
    expect(after.evidenceCount).toBe(before.evidenceCount);
    expect(service.getSession(session.id).assistance.events).toHaveLength(1);
    expect(service.getSession(session.id).assistance.messages).toHaveLength(2);
  });

  it("derives personal engagement without exposing the learner on the fictional leaderboard", () => {
    const learner = service.createLearner({ name: "Private Learner", grade: 6 });
    const home = service.getHome(learner.id);
    const leaderboard = service.getLeaderboard();

    expect(home.engagement.xp).toBe(0);
    expect(home.engagement.boundary.affectsLearnerModel).toBe(false);
    expect(home.learningAreas).toHaveLength(6);
    expect(home.todayGoal.questionsCompleted).toBe(0);
    expect(home.todayGoal.completionPercent).toBe(0);
    expect(leaderboard.entries.every((entry) => entry.name !== learner.name)).toBe(true);
    expect(leaderboard.entries.map((entry) => entry.name)).toEqual([
      "Ashutosh S.",
      "Tanix S.",
      "Bhagat R.",
      "Ayush R.",
      "Apple S.",
      "Dev P.",
      "Zaid S."
    ]);

    const progress = service.getProgress(learner.id);
    expect(progress.evidenceSummary.totalInteractions).toBe(0);
    expect(progress.recommendation.reasonCode).toBe("INSUFFICIENT_EVIDENCE");

    const olderLearner = service.createLearner({ name: "Grade Seven Learner", grade: 7 });
    const olderHome = service.getHome(olderLearner.id);
    const olderProgress = service.getProgress(olderLearner.id);
    expect(olderHome.activeGoal).toBeNull();
    expect(olderHome.learningAreas.every((area) => area.status === "available")).toBe(true);
    expect(olderProgress.goal).toBeNull();
    expect(olderProgress.recommendation.reasonCode).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("records an auditable assessment update without a learning transition", () => {
    const learner = service.createLearner({ name: "Audit Learner", grade: 6 });
    const session = service.startGoal(learner.id, "math-g6-fractions-foundations");
    const content = getContentItem(session.activity!.id);
    const response = service.respond(session.id, { selectedOptionId: content.correctOptionId });
    const audit = database
      .prepare("SELECT * FROM learner_state_updates WHERE learner_id = ?")
      .get(learner.id) as Record<string, unknown>;

    expect("appliedLearningTransition" in response.modelUpdate).toBe(true);
    if (!("appliedLearningTransition" in response.modelUpdate)) throw new Error("Expected model update");
    expect(response.modelUpdate.appliedLearningTransition).toBe(false);
    expect(audit.applied_learning_transition).toBe(0);
    expect(audit.posterior_final).toBe(audit.posterior_observation);
    expect(audit.evidence_policy_version).toContain("evidence-policy");
    expect(JSON.parse(String(audit.model_config_json)).version).toBe(BKT_CONFIG.version);
  });

  it("rolls back evidence if the learner-model update fails", () => {
    const failingModel: LearnerModel = {
      type: "Failing test boundary",
      version: BKT_CONFIG.version,
      status: "provisional",
      initialProbability: BKT_CONFIG.pInit,
      configuration: BKT_CONFIG,
      update: () => { throw new Error("model unavailable"); }
    };
    service = new LearningService(database, failingModel);
    const learner = service.createLearner({ name: "Rollback Learner", grade: 6 });
    const session = service.startGoal(learner.id, "math-g6-fractions-foundations");
    const content = getContentItem(session.activity!.id);

    expect(() => service.respond(session.id, { selectedOptionId: content.correctOptionId }))
      .toThrow("model unavailable");
    const evidence = database.prepare("SELECT COUNT(*) AS count FROM evidence").get() as { count: number };
    const savedSession = database.prepare("SELECT current_answered FROM sessions WHERE id = ?").get(session.id) as { current_answered: number };
    expect(evidence.count).toBe(0);
    expect(savedSession.current_answered).toBe(0);
  });

  it("persists preferences and protects learner access with a secret token", () => {
    const learner = service.createLearner({ name: "Secure Learner", grade: 6 });
    expect(() => service.authorizeLearner("wrong-token", learner.id)).toThrow();
    expect(() => service.authorizeLearner(learner.accessToken, learner.id)).not.toThrow();

    const saved = service.updatePreferences(learner.id, {
      sessionLengthMinutes: 30,
      reduceMotion: true,
      largerText: true,
      privateProfile: false
    });
    expect(saved).toMatchObject({
      interfaceLanguage: "English",
      sessionLengthMinutes: 30,
      reduceMotion: true,
      largerText: true,
      privateProfile: false
    });
  });

  it("persists challenge play without writing learning evidence or learner state", () => {
    const learner = service.createLearner({ name: "Challenge Learner", grade: 6 });
    let match = service.startChallenge({
      learnerId: learner.id,
      goalId: "math-g6-fractions-foundations",
      mode: "one_v_one"
    });
    const question = getContentItem(match.question!.id);
    match = service.respondToChallenge(match.id, learner.id, {
      selectedOptionId: question.correctOptionId,
      responseTimeMs: 4000
    });

    expect(match.currentAnswered).toBe(true);
    expect(match.feedback.correct).toBe(true);
    expect(match.boundary.writesLearningEvidence).toBe(false);
    while (match.status === "active") {
      match = service.nextChallengeQuestion(match.id, learner.id);
      if (match.status === "complete") break;
      const nextQuestion = getContentItem(match.question!.id);
      match = service.respondToChallenge(match.id, learner.id, {
        selectedOptionId: nextQuestion.correctOptionId,
        responseTimeMs: 4000
      });
    }
    expect(match.status).toBe("complete");
    expect(match.result?.correctAnswers).toBe(5);
    expect((database.prepare("SELECT COUNT(*) AS count FROM challenge_responses").get() as { count: number }).count).toBe(5);
    expect((database.prepare("SELECT COUNT(*) AS count FROM evidence").get() as { count: number }).count).toBe(0);
    expect((database.prepare("SELECT COUNT(*) AS count FROM learner_states").get() as { count: number }).count).toBe(0);
  });

  it("prioritises and completes a learner-requested reassessment", () => {
    const learner = service.createLearner({ name: "Recheck Learner", grade: 6 });
    let session = service.startGoal(learner.id, "math-g6-fractions-foundations");
    while (session.phase === "diagnostic") {
      const content = getContentItem(session.activity!.id);
      service.respond(session.id, { selectedOptionId: content.correctOptionId });
      session = service.next(session.id);
    }

    service.disputeState(learner.id, "fractions.compare", "I want to show this skill again.");
    const current = getContentItem(session.activity!.id);
    service.respond(session.id, { selectedOptionId: current.correctOptionId });
    session = service.next(session.id);
    expect(session.reason.code).toBe("REASSESSMENT_REQUESTED");
    expect(session.activity!.knowledgeComponent?.id).toBe("fractions.compare");

    const reassessment = getContentItem(session.activity!.id);
    service.respond(session.id, { selectedOptionId: reassessment.correctOptionId });
    const dispute = database
      .prepare("SELECT status, resolved_at FROM state_disputes WHERE learner_id = ?")
      .get(learner.id) as { status: string; resolved_at: string | null };
    expect(dispute.status).toBe("completed");
    expect(dispute.resolved_at).not.toBeNull();
  });

  it("creates a ten-participant rapid-fire round from available learning content", () => {
    const learner = service.createLearner({ name: "Rapid Learner", grade: 6 });
    const match = service.startChallenge({
      learnerId: learner.id,
      goalId: "math-g6-fractions-foundations",
      mode: "rapid_fire"
    });
    expect(match.ranking).toHaveLength(10);
    expect(match.progress.total).toBe(10);
    expect(match.ranking.filter((participant) => participant.current)).toHaveLength(1);
    expect(match.ranking.filter((participant) => participant.kind === "practice_opponent")).toHaveLength(9);
    expect(match.boundary.affectsAssessment).toBe(false);
  });
});
