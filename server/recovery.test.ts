import { describe, expect, it } from "vitest";
import { createDatabase } from "./database";
import { LearningService } from "./learningService";
import { LEARNING_DOMAINS, getDomainsForGrade } from "../src/content/catalog";

describe("learning cycle recovery", () => {
  for (const domain of LEARNING_DOMAINS) {
    it(`completes ${domain.goal.title} and excludes repeated answers in a new cycle`, () => {
      const db = createDatabase(":memory:");
      try {
        const service = new LearningService(db);
        const learner = service.createLearner({name:"Independent learner",grade:domain.goal.grade});
        let session = service.startGoal(learner.id,domain.goal.id);
        for (let step=0;step<domain.contentItems.length+5 && session.phase!=="complete";step++) {
          if (session.phase === "checkpoint_ready") { session=service.startCheckpoint(session.id); continue; }
          const item=domain.contentItems.find((entry)=>entry.id===session.activity?.id)!;
          expect(item).toBeDefined();
          service.respond(session.id,{selectedOptionId:item.correctOptionId});
          session=service.next(session.id);
        }
        expect(session.phase).toBe("complete");
        expect(session.skills.every((skill)=>skill.status==="secure")).toBe(true);
        const repeated=service.startGoal(learner.id,domain.goal.id);
        const before=repeated.skills.map((skill)=>skill.probability);
        const item=domain.contentItems.find((entry)=>entry.id===repeated.activity?.id)!;
        expect(service.respond(repeated.id,{selectedOptionId:item.correctOptionId}).contributedToModel).toBe(false);
        expect(service.getSession(repeated.id).skills.map((skill)=>skill.probability)).toEqual(before);
      } finally {db.close();}
    });
    it(`finishes an all-skipped ${domain.goal.title} cycle without awarding mastery`, () => {
      const db = createDatabase(":memory:");
      try {
        const service = new LearningService(db);
        const learner = service.createLearner({ name: "Recovery learner", grade: domain.goal.grade });
        let session = service.startGoal(learner.id, domain.goal.id);
        for (let step = 0; step < domain.contentItems.length + 5 && session.phase !== "complete"; step++) {
          if (session.phase === "checkpoint_ready") { session = service.startCheckpoint(session.id); continue; }
          expect(session.activity).not.toBeNull();
          service.respond(session.id, { skipped: true });
          session = service.next(session.id);
        }
        expect(session.phase).toBe("complete");
        expect(session.skills.every((skill) => skill.evidenceCount === 0)).toBe(true);
        expect(service.getHome(learner.id).goalStatus.status).toBe("active");
      } finally { db.close(); }
    });
  }
  it("recovers a previously stranded session when the goal is resumed", () => {
    const db = createDatabase(":memory:");
    try {
      const service = new LearningService(db);
      const learner = service.createLearner({name:"Returning learner",grade:6});
      const session = service.startGoal(learner.id, LEARNING_DOMAINS[0].goal.id);
      db.prepare("UPDATE sessions SET phase = 'learning', current_item_id = NULL WHERE id = ?").run(session.id);
      const resumed = service.startGoal(learner.id, LEARNING_DOMAINS[0].goal.id);
      expect(resumed.id).toBe(session.id);
      expect(resumed.activity).not.toBeNull();
    } finally { db.close(); }
  });

  for (let grade = 1; grade <= 8; grade += 1) {
    it(`starts both isolated Mathematics challenge modes for Grade ${grade}`, () => {
      const db = createDatabase(":memory:");
      try {
        const service = new LearningService(db);
        const learner = service.createLearner({ name: "Challenge learner", grade: grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 });
        const mathematics = getDomainsForGrade(grade).find((domain) => domain.goal.subject === "Mathematics");
        expect(mathematics).toBeDefined();
        const duel = service.startChallenge({ learnerId: learner.id, goalId: mathematics!.goal.id, mode: "one_v_one" });
        const rapid = service.startChallenge({ learnerId: learner.id, goalId: mathematics!.goal.id, mode: "rapid_fire" });
        expect(duel.progress.total).toBe(5);
        expect(rapid.progress.total).toBe(10);
        expect(duel.question).not.toBeNull();
        if (!duel.question) throw new Error("Expected an active challenge question.");
        service.respondToChallenge(duel.id, learner.id, { selectedOptionId: duel.question.options[0].id, responseTimeMs: 1000 });
        const evidenceCount = db.prepare("SELECT COUNT(*) AS count FROM evidence WHERE learner_id = ?").get(learner.id) as { count: number };
        expect(evidenceCount.count).toBe(0);
      } finally { db.close(); }
    });
  }
});
