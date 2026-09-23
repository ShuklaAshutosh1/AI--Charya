import { randomUUID } from "node:crypto";
import { getCatalogContentItem, getLearningDomain } from "../src/content/catalog.js";
import type { Grade } from "../src/domain/types.js";
import { runInTransaction, type AppDatabase } from "./database.js";

export type ChallengeMode = "one_v_one" | "rapid_fire";

interface MatchRow {
  id: string;
  learner_id: string;
  goal_id: string;
  mode: ChallengeMode;
  status: "active" | "complete";
  question_ids_json: string;
  participants_json: string;
  participant_scores_json: string;
  current_question_index: number;
  current_answered: number;
  learner_score: number;
  last_feedback_json: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface LearnerRow {
  id: string;
  name: string;
  grade: Grade;
}

interface Participant {
  id: string;
  name: string;
  initials: string;
  current: boolean;
  kind: "learner" | "practice_opponent";
}

const PRACTICE_OPPONENTS = [
  "Ashutosh S.",
  "Tanix S.",
  "Ayush R.",
  "Apple S.",
  "Dev P.",
  "Zaid S.",
  "Meera K.",
  "Kabir N.",
  "Riya M."
] as const;

const BOUNDARY = {
  purpose: "competitive_practice",
  participants: "computer_controlled_practice_opponents",
  affectsLearnerModel: false,
  writesLearningEvidence: false,
  callsAdaptivePlanner: false,
  affectsAssessment: false
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function scoreFor(correct: boolean, responseTimeMs: number | null, limitSeconds: number): number {
  if (!correct) return 0;
  const elapsed = Math.max(0, responseTimeMs ?? limitSeconds * 1000);
  const speedRatio = Math.max(0, 1 - elapsed / (limitSeconds * 1000));
  return 100 + Math.round(speedRatio * 35);
}

export class ChallengeService {
  constructor(private readonly database: AppDatabase) {}

  start(input: { learnerId: string; goalId: string; mode: ChallengeMode }) {
    const learner = this.database
      .prepare("SELECT id, name, grade FROM learners WHERE id = ?")
      .get(input.learnerId) as LearnerRow | undefined;
    if (!learner) throw new Error("Learner not found.");
    if (input.mode !== "one_v_one" && input.mode !== "rapid_fire") {
      throw new Error("Choose a valid challenge mode.");
    }
    const domain = getLearningDomain(input.goalId);
    if (domain.goal.grade !== learner.grade) {
      throw new Error(`This challenge is not available for Grade ${learner.grade}.`);
    }
    const count = input.mode === "one_v_one" ? 5 : 10;
    const questions = domain.contentItems
      .filter((item) => item.modes.includes("learning") && item.type === "single_choice")
      .slice(0, count);
    if (questions.length < count) throw new Error("There are not enough available practice questions for this challenge.");

    const current: Participant = {
      id: learner.id,
      name: learner.name,
      initials: initials(learner.name),
      current: true,
      kind: "learner"
    };
    const opponentOffset = stableNumber(learner.id) % PRACTICE_OPPONENTS.length;
    const selected = Array.from({ length: input.mode === "one_v_one" ? 1 : 9 }, (_, index) =>
      PRACTICE_OPPONENTS[(opponentOffset + index) % PRACTICE_OPPONENTS.length]
    );
    const opponents: Participant[] = selected.map((name, index) => ({
      id: `practice-${opponentOffset}-${index}`,
      name,
      initials: initials(name),
      current: false,
      kind: "practice_opponent"
    }));
    const participants = [current, ...opponents];
    const scores = Object.fromEntries(participants.map((participant) => [participant.id, 0]));
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    this.database
      .prepare(
        `INSERT INTO challenge_matches
         (id, learner_id, goal_id, mode, status, question_ids_json, participants_json,
          participant_scores_json, current_question_index, current_answered, learner_score,
          last_feedback_json, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, 0, 0, NULL, ?, ?, NULL)`
      )
      .run(
        id,
        learner.id,
        domain.goal.id,
        input.mode,
        JSON.stringify(questions.map((question) => question.id)),
        JSON.stringify(participants),
        JSON.stringify(scores),
        timestamp,
        timestamp
      );
    return this.get(id, learner.id);
  }

  get(matchId: string, learnerId: string) {
    const row = this.getRow(matchId, learnerId);
    const domain = getLearningDomain(row.goal_id);
    const questionIds = JSON.parse(row.question_ids_json) as string[];
    const participants = JSON.parse(row.participants_json) as Participant[];
    const scores = JSON.parse(row.participant_scores_json) as Record<string, number>;
    const questionId = questionIds[row.current_question_index];
    const content = questionId ? getCatalogContentItem(questionId) : null;
    const feedback = row.last_feedback_json ? JSON.parse(row.last_feedback_json) : null;
    const ranking = participants
      .map((participant) => ({ ...participant, score: scores[participant.id] ?? 0 }))
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
      .map((participant, index) => ({ ...participant, rank: index + 1 }));

    return {
      id: row.id,
      mode: row.mode,
      status: row.status,
      topic: { goalId: domain.goal.id, subject: domain.goal.subject, topic: domain.goal.topic },
      timerSeconds: row.mode === "one_v_one" ? 15 : 12,
      progress: {
        current: Math.min(row.current_question_index + 1, questionIds.length),
        total: questionIds.length,
        answered: this.countResponses(row.id)
      },
      currentAnswered: Boolean(row.current_answered),
      question: content
        ? { id: content.id, prompt: content.prompt, context: content.context, options: content.options }
        : null,
      feedback,
      learnerScore: row.learner_score,
      ranking,
      result: row.status === "complete"
        ? {
            learnerRank: ranking.find((participant) => participant.current)?.rank ?? ranking.length,
            correctAnswers: this.countCorrectResponses(row.id),
            completedAt: row.completed_at
          }
        : null,
      boundary: BOUNDARY
    };
  }

  respond(matchId: string, learnerId: string, input: { selectedOptionId?: string; responseTimeMs?: number | null }) {
    const row = this.getRow(matchId, learnerId);
    if (row.status !== "active") throw new Error("This challenge is complete.");
    if (row.current_answered) throw new Error("This question has already been answered.");
    const questionIds = JSON.parse(row.question_ids_json) as string[];
    const item = getCatalogContentItem(questionIds[row.current_question_index]);
    const optionId = input.selectedOptionId?.trim() || null;
    if (optionId && !item.options.some((option) => option.id === optionId)) {
      throw new Error("Choose one of the available answers.");
    }
    const correct = optionId === item.correctOptionId;
    const limitSeconds = row.mode === "one_v_one" ? 15 : 12;
    const responseTimeMs = typeof input.responseTimeMs === "number"
      ? Math.max(0, Math.round(input.responseTimeMs))
      : null;
    const scoreDelta = scoreFor(correct, responseTimeMs, limitSeconds);
    const participants = JSON.parse(row.participants_json) as Participant[];
    const scores = JSON.parse(row.participant_scores_json) as Record<string, number>;
    scores[learnerId] = (scores[learnerId] ?? 0) + scoreDelta;
    for (const participant of participants.filter((entry) => !entry.current)) {
      const roll = stableNumber(`${row.id}:${row.current_question_index}:${participant.id}`) % 100;
      const opponentCorrect = roll < (row.mode === "one_v_one" ? 72 : 68);
      const opponentTime = 2800 + (stableNumber(`${participant.id}:speed:${row.current_question_index}`) % 7800);
      scores[participant.id] = (scores[participant.id] ?? 0) + scoreFor(opponentCorrect, opponentTime, limitSeconds);
    }
    const feedback = {
      contentItemId: item.id,
      correct,
      correctOptionId: item.correctOptionId,
      explanation: item.explanation,
      scoreDelta,
      responseTimeMs
    };
    const timestamp = new Date().toISOString();
    runInTransaction(this.database, () => {
      this.database
        .prepare(
          `INSERT INTO challenge_responses
           (id, match_id, learner_id, content_item_id, selected_option_id, correct,
            response_time_ms, score_delta, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(randomUUID(), row.id, learnerId, item.id, optionId, correct ? 1 : 0, responseTimeMs, scoreDelta, timestamp);
      this.database
        .prepare(
          `UPDATE challenge_matches SET current_answered = 1, learner_score = ?,
           participant_scores_json = ?, last_feedback_json = ?, updated_at = ? WHERE id = ?`
        )
        .run(scores[learnerId], JSON.stringify(scores), JSON.stringify(feedback), timestamp, row.id);
    });
    return this.get(row.id, learnerId);
  }

  next(matchId: string, learnerId: string) {
    const row = this.getRow(matchId, learnerId);
    if (row.status !== "active") return this.get(row.id, learnerId);
    if (!row.current_answered) throw new Error("Answer the current question before continuing.");
    const questionIds = JSON.parse(row.question_ids_json) as string[];
    const atEnd = row.current_question_index >= questionIds.length - 1;
    const timestamp = new Date().toISOString();
    this.database
      .prepare(
        `UPDATE challenge_matches SET status = ?, current_question_index = ?, current_answered = 0,
         last_feedback_json = NULL, updated_at = ?, completed_at = ? WHERE id = ?`
      )
      .run(
        atEnd ? "complete" : "active",
        atEnd ? row.current_question_index : row.current_question_index + 1,
        timestamp,
        atEnd ? timestamp : null,
        row.id
      );
    return this.get(row.id, learnerId);
  }

  private getRow(matchId: string, learnerId: string): MatchRow {
    const row = this.database
      .prepare("SELECT * FROM challenge_matches WHERE id = ? AND learner_id = ?")
      .get(matchId, learnerId) as MatchRow | undefined;
    if (!row) throw new Error("Challenge not found.");
    return row;
  }

  private countResponses(matchId: string): number {
    return (this.database.prepare("SELECT COUNT(*) AS count FROM challenge_responses WHERE match_id = ?").get(matchId) as { count: number }).count;
  }

  private countCorrectResponses(matchId: string): number {
    return (this.database.prepare("SELECT COALESCE(SUM(correct), 0) AS count FROM challenge_responses WHERE match_id = ?").get(matchId) as { count: number }).count;
  }
}
