import { createHash, randomBytes, randomUUID } from "node:crypto";
import { runInTransaction, type AppDatabase } from "./database.js";
import {
  LEARNING_DOMAINS,
  getCatalogContentItem,
  getCatalogKnowledgeComponent,
  getDomainForContentItem,
  getDomainsForGrade,
  getLearningDomain
} from "../src/content/catalog.js";
import { PLANNER_POLICY } from "../src/domain/config.js";
import {
  EVIDENCE_POLICY_VERSION,
  SPACED_REVIEW_INTERVAL_DAYS,
  classifyEvidence
} from "../src/domain/evidencePolicy.js";
import { BKT_LEARNER_MODEL, type LearnerModel } from "../src/domain/learnerModel.js";
import type { CompanionProvider } from "../src/domain/companion.js";
import { initialLearnerState, summarizeSkill } from "../src/domain/learnerState.js";
import { chooseNextActivity, plannerExplanation } from "../src/domain/planner.js";
import type {
  ActivityMode,
  EvidenceRecord,
  Grade,
  HelpKind,
  LearningEntryMode,
  LearnerState,
  PlannerDecision,
  PlannerReasonCode,
  ReassessmentRequest,
  SessionPhase
} from "../src/domain/types.js";
import { ReviewedContentCompanion } from "./companionProvider.js";
import { getLearningAreasForGrade } from "../src/product/learningAreas.js";
import { PRACTICE_LEADERBOARD } from "./leaderboardProfiles.js";
import { ChallengeService, type ChallengeMode } from "./challengeService.js";

interface SessionRow {
  id: string;
  learner_id: string;
  goal_id: string;
  phase: SessionPhase;
  status: string;
  current_item_id: string | null;
  reason_code: PlannerReasonCode;
  reason_message: string;
  current_answered: number;
  entry_mode: LearningEntryMode;
  created_at: string;
  updated_at: string;
}

interface LearnerRow {
  id: string;
  name: string;
  grade: Grade;
  context: string;
  created_at: string;
}

interface StateRow {
  learner_id: string;
  knowledge_component_id: string;
  p_mastery: number;
  independent_evidence_count: number;
  independent_correct_count: number;
  model_version: string;
  updated_at: string;
}

interface ModelUpdateSummary {
  knowledgeComponentId: string;
  prior: number;
  posteriorAfterObservation: number;
  posterior: number;
  appliedLearningTransition: boolean;
  evidencePolicyReason: string;
  modelVersion: string;
}

const HELP_LEVELS: Record<HelpKind, number> = {
  clarify: 1,
  known_information: 2,
  conceptual_hint: 3,
  method_step: 4,
  analogous_example: 5,
  guided_steps: 6,
  complete_solution: 7
};

const HELP_LABELS: Record<HelpKind, string> = {
  clarify: "Clarify the question",
  known_information: "What do I already know?",
  conceptual_hint: "Give me a conceptual hint",
  method_step: "Show the next method step",
  analogous_example: "Show a similar example",
  guided_steps: "Guide me step by step",
  complete_solution: "Show the complete solution"
};

function now(): string {
  return new Date().toISOString();
}

function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function asLearnerState(row: StateRow): LearnerState {
  return {
    learnerId: row.learner_id,
    knowledgeComponentId: row.knowledge_component_id,
    pMastery: row.p_mastery,
    independentEvidenceCount: row.independent_evidence_count,
    independentCorrectCount: row.independent_correct_count,
    modelVersion: row.model_version,
    updatedAt: row.updated_at
  };
}

export class LearningService {
  private readonly challenges: ChallengeService;

  constructor(
    private readonly database: AppDatabase,
    private readonly learnerModel: LearnerModel = BKT_LEARNER_MODEL,
    private readonly companionProvider: CompanionProvider = new ReviewedContentCompanion()
  ) {
    this.challenges = new ChallengeService(database);
  }

  getCatalog(grade?: number) {
    const domains = getDomainsForGrade(grade);
    return {
      platformScope: {
        geography: "India-first",
        grades: [1, 2, 3, 4, 5, 6, 7, 8],
        availableSubjects: [...new Set(domains.map((domain) => domain.goal.subject))],
        availableTopics: domains.map((domain) => domain.goal.topic)
      },
      learningAreas: getLearningAreasForGrade(grade),
      goals: domains.map((domain) => domain.goal),
      unavailableMessage: domains.length
        ? null
        : "Learning content for this grade is coming soon.",
      knowledgeComponents: domains.flatMap((domain) => domain.knowledgeComponents),
      model: {
        type: this.learnerModel.type,
        version: this.learnerModel.version,
        status: this.learnerModel.status
      },
      planner: {
        version: PLANNER_POLICY.version,
        status: PLANNER_POLICY.status
      }
    };
  }

  createLearner(input: { name: string; grade: Grade }) {
    const id = randomUUID();
    const accessToken = randomBytes(32).toString("base64url");
    const createdAt = now();
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Please enter a name with at least two characters.");
    if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 8) throw new Error("Choose a grade from 1 to 8.");
    runInTransaction(this.database, () => {
      this.database
        .prepare("INSERT INTO learners (id, name, grade, context, created_at) VALUES (?, ?, ?, 'independent', ?)")
        .run(id, name, input.grade, createdAt);
      this.database
        .prepare(
          "INSERT INTO learner_access (learner_id, token_hash, created_at, last_used_at) VALUES (?, ?, ?, ?)"
        )
        .run(id, hashAccessToken(accessToken), createdAt, createdAt);
      this.database
        .prepare(
          `INSERT INTO learner_preferences
           (learner_id, interface_language, session_length_minutes, reduce_motion,
            larger_text, private_profile, updated_at)
           VALUES (?, 'English', 20, 0, 0, 1, ?)`
        )
        .run(id, createdAt);
    });
    return { ...this.getLearner(id), accessToken };
  }

  authorizeLearner(accessToken: string, learnerId: string): void {
    if (!accessToken) throw new Error("Please sign in to continue.");
    const record = this.database
      .prepare("SELECT token_hash FROM learner_access WHERE learner_id = ?")
      .get(learnerId) as { token_hash: string } | undefined;
    if (!record || record.token_hash !== hashAccessToken(accessToken)) {
      throw new Error("Your learning session could not be verified. Please sign in again.");
    }
    this.database
      .prepare("UPDATE learner_access SET last_used_at = ? WHERE learner_id = ?")
      .run(now(), learnerId);
  }

  authorizeSession(accessToken: string, sessionId: string): void {
    const session = this.database
      .prepare("SELECT learner_id FROM sessions WHERE id = ?")
      .get(sessionId) as { learner_id: string } | undefined;
    if (!session) throw new Error("Learning session not found.");
    this.authorizeLearner(accessToken, session.learner_id);
  }

  authorizeChallenge(accessToken: string, matchId: string): void {
    const match = this.database
      .prepare("SELECT learner_id FROM challenge_matches WHERE id = ?")
      .get(matchId) as { learner_id: string } | undefined;
    if (!match) throw new Error("Challenge not found.");
    this.authorizeLearner(accessToken, match.learner_id);
  }

  getLearner(id: string) {
    const learner = this.database.prepare("SELECT * FROM learners WHERE id = ?").get(id) as
      | LearnerRow
      | undefined;
    if (!learner) throw new Error("Learner not found.");
    return {
      id: learner.id,
      name: learner.name,
      grade: learner.grade,
      context: learner.context,
      createdAt: learner.created_at
    };
  }

  getHome(learnerId: string) {
    const learner = this.getLearner(learnerId);
    const activeSession = this.database
      .prepare(
        "SELECT id, phase, updated_at FROM sessions WHERE learner_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1"
      )
      .get(learnerId) as { id: string; phase: SessionPhase; updated_at: string } | undefined;
    const progress = this.getProgress(learnerId);
    const goalRecord = this.database
      .prepare(
        `SELECT goal_id, status, updated_at FROM learner_goals
         WHERE learner_id = ?
         ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`
      )
      .get(learnerId) as
      | { goal_id: string; status: string; updated_at: string }
      | undefined;
    const activeGoal = goalRecord?.status === "active"
      ? getLearningDomain(goalRecord.goal_id).goal
      : null;
    return {
      learner,
      activeSession: activeSession
        ? { id: activeSession.id, phase: activeSession.phase, updatedAt: activeSession.updated_at }
        : null,
      activeGoal,
      goalStatus: goalRecord
        ? { status: goalRecord.status, updatedAt: goalRecord.updated_at }
        : { status: "not_started", updatedAt: null },
      recommendation: progress.recommendation,
      learningAreas: getLearningAreasForGrade(learner.grade),
      recentActivity: this.getRecentActivity(learnerId, 4),
      weeklyActivity: this.getWeeklyActivity(learnerId),
      todayGoal: this.getTodayGoal(learnerId),
      engagement: this.getEngagement(learnerId)
    };
  }

  getLeaderboard() {
    return PRACTICE_LEADERBOARD;
  }

  getPreferences(learnerId: string) {
    this.getLearner(learnerId);
    const timestamp = now();
    this.database
      .prepare(
        `INSERT OR IGNORE INTO learner_preferences
         (learner_id, interface_language, session_length_minutes, reduce_motion,
          larger_text, private_profile, updated_at)
         VALUES (?, 'English', 20, 0, 0, 1, ?)`
      )
      .run(learnerId, timestamp);
    const row = this.database
      .prepare("SELECT * FROM learner_preferences WHERE learner_id = ?")
      .get(learnerId) as Record<string, unknown>;
    return {
      interfaceLanguage: String(row.interface_language),
      sessionLengthMinutes: Number(row.session_length_minutes),
      reduceMotion: Boolean(row.reduce_motion),
      largerText: Boolean(row.larger_text),
      privateProfile: Boolean(row.private_profile),
      updatedAt: String(row.updated_at)
    };
  }

  updatePreferences(
    learnerId: string,
    input: {
      interfaceLanguage?: string;
      sessionLengthMinutes?: number;
      reduceMotion?: boolean;
      largerText?: boolean;
      privateProfile?: boolean;
    }
  ) {
    const current = this.getPreferences(learnerId);
    const language = input.interfaceLanguage ?? current.interfaceLanguage;
    if (language !== "English") throw new Error("This interface language is not available yet.");
    const sessionLength = input.sessionLengthMinutes ?? current.sessionLengthMinutes;
    if (![15, 20, 30].includes(sessionLength)) throw new Error("Choose a 15, 20, or 30 minute session.");
    const updatedAt = now();
    this.database
      .prepare(
        `UPDATE learner_preferences SET interface_language = ?, session_length_minutes = ?,
         reduce_motion = ?, larger_text = ?, private_profile = ?, updated_at = ?
         WHERE learner_id = ?`
      )
      .run(
        language,
        sessionLength,
        (input.reduceMotion ?? current.reduceMotion) ? 1 : 0,
        (input.largerText ?? current.largerText) ? 1 : 0,
        (input.privateProfile ?? current.privateProfile) ? 1 : 0,
        updatedAt,
        learnerId
      );
    return this.getPreferences(learnerId);
  }

  startChallenge(input: { learnerId: string; goalId: string; mode: ChallengeMode }) {
    return this.challenges.start(input);
  }

  getChallenge(matchId: string, learnerId: string) {
    return this.challenges.get(matchId, learnerId);
  }

  respondToChallenge(
    matchId: string,
    learnerId: string,
    input: { selectedOptionId?: string; responseTimeMs?: number | null }
  ) {
    return this.challenges.respond(matchId, learnerId, input);
  }

  nextChallengeQuestion(matchId: string, learnerId: string) {
    return this.challenges.next(matchId, learnerId);
  }

  getProfileOverview(learnerId: string) {
    const learner = this.getLearner(learnerId);
    const goals = this.database
      .prepare(
        "SELECT goal_id, status, created_at, updated_at FROM learner_goals WHERE learner_id = ? ORDER BY updated_at DESC"
      )
      .all(learnerId) as unknown as Array<{
      goal_id: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>;
    const sessions = this.database
      .prepare(
        "SELECT id, goal_id, phase, status, created_at, updated_at FROM sessions WHERE learner_id = ? ORDER BY updated_at DESC LIMIT 8"
      )
      .all(learnerId) as unknown as Array<{
      id: string;
      goal_id: string;
      phase: SessionPhase;
      status: string;
      created_at: string;
      updated_at: string;
    }>;

    return {
      learner,
      activeGoals: goals.map((goal) => {
        const domain = getLearningDomain(goal.goal_id);
        return {
          id: goal.goal_id,
          title: domain.goal.title,
          subject: domain.goal.subject,
          topic: domain.goal.topic,
          status: goal.status,
          updatedAt: goal.updated_at
        };
      }),
      sessionHistory: sessions.map((session) => {
        const domain = getLearningDomain(session.goal_id);
        return {
          id: session.id,
          title: domain.goal.title,
          phase: session.phase,
          status: session.status,
          startedAt: session.created_at,
          updatedAt: session.updated_at
        };
      }),
      engagement: this.getEngagement(learnerId),
      preferences: this.getPreferences(learnerId),
      account: { context: learner.context }
    };
  }

  startGoal(learnerId: string, goalId: string, entryMode: LearningEntryMode = "check") {
    if (entryMode !== "learn" && entryMode !== "check") {
      throw new Error("Choose how you would like to begin this learning path.");
    }
    const learner = this.getLearner(learnerId);
    const domain = getLearningDomain(goalId);
    if (learner.grade !== domain.goal.grade) {
      throw new Error(`This learning goal is not available for Grade ${learner.grade}.`);
    }

    const existing = this.database
      .prepare(
        "SELECT * FROM sessions WHERE learner_id = ? AND goal_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1"
      )
      .get(learnerId, goalId) as SessionRow | undefined;
    if (existing) {
      if (existing.phase === "learning" && !existing.current_item_id) {
        this.applyPlannerDecision(existing, "learning");
      }
      return this.getSession(existing.id);
    }

    const timestamp = now();
    const learnerGoalId = randomUUID();
    const firstItem = entryMode === "check"
      ? domain.contentItems.find(
          (entry) => entry.modes.includes("diagnostic") && entry.assessmentEligible
        )
      : null;
    if (entryMode === "check" && !firstItem) {
      throw new Error("This learning path does not have a starting check yet.");
    }
    const sessionId = randomUUID();
    const initialPhase: SessionPhase = entryMode === "check" ? "diagnostic" : "learning";
    const initialReason: PlannerReasonCode =
      entryMode === "check" ? "DIAGNOSTIC_BASELINE" : "INSUFFICIENT_EVIDENCE";
    const initialMessage = entryMode === "check"
      ? plannerExplanation("DIAGNOSTIC_BASELINE")
      : "Start learning now. Your independent responses will shape each next activity.";

    runInTransaction(this.database, () => {
      this.database
        .prepare(
          `INSERT INTO learner_goals (id, learner_id, goal_id, status, created_at, updated_at)
           VALUES (?, ?, ?, 'active', ?, ?)
           ON CONFLICT(learner_id, goal_id) DO UPDATE SET status = 'active', updated_at = excluded.updated_at`
        )
        .run(learnerGoalId, learnerId, goalId, timestamp, timestamp);

      for (const component of domain.knowledgeComponents) {
        const state = initialLearnerState(learnerId, component.id, this.learnerModel);
        this.database
          .prepare(
            `INSERT OR IGNORE INTO learner_states
             (learner_id, knowledge_component_id, p_mastery, independent_evidence_count,
              independent_correct_count, model_version, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            learnerId,
            component.id,
            state.pMastery,
            state.independentEvidenceCount,
            state.independentCorrectCount,
            state.modelVersion,
            timestamp
          );
      }

           this.database
        .prepare(
         `INSERT INTO sessions
           (id, learner_id, goal_id, phase, status, current_item_id, reason_code,
            reason_message, current_answered, entry_mode, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, ?, ?)`
        )
        .run(
          sessionId,
          learnerId,
          goalId,
          initialPhase,
          firstItem?.id ?? null,
          initialReason,
          initialMessage,
          entryMode,
          timestamp,
          timestamp
        );
      if (entryMode === "check" && firstItem) {
        this.recordDecision(sessionId, learnerId, {
          reasonCode: "DIAGNOSTIC_BASELINE",
          knowledgeComponentId: firstItem.knowledgeComponentId,
          contentItemId: firstItem.id,
          studentExplanation: plannerExplanation("DIAGNOSTIC_BASELINE"),
          policyVersion: PLANNER_POLICY.version,
          context: { diagnosticCoverageIndex: 0, entryMode }
        });
      }
    });
    if (entryMode === "learn") {
      this.applyPlannerDecision(this.getSessionRow(sessionId), "learning");
    }
    return this.getSession(sessionId);
  }

  getSession(sessionId: string) {
    const session = this.getSessionRow(sessionId);
    const domain = getLearningDomain(session.goal_id);
    const learner = this.getLearner(session.learner_id);
    const states = this.getStates(session.learner_id, domain.goal.knowledgeComponentIds);
    const evidence = this.getEvidence(session.id);
    const currentItem = session.current_item_id ? getCatalogContentItem(session.current_item_id) : null;
    const mode = this.modeForPhase(session.phase);
    const phaseEvidence = mode ? evidence.filter((entry) => entry.mode === mode) : [];
    const total = mode === "diagnostic" || mode === "checkpoint" ? domain.knowledgeComponents.length : null;
    const latestForItem = currentItem
      ? evidence.find((entry) => entry.contentItemId === currentItem.id)
      : undefined;
    const assistance = currentItem
      ? this.getAssistance(session.id, currentItem.id)
      : { events: [], messages: [] };
    const maxHelpLevel = session.phase === "learning" ? 6 : 1;
    const component = currentItem ? getCatalogKnowledgeComponent(currentItem.knowledgeComponentId) : null;

    return {
      id: session.id,
      learner,
      goal: domain.goal,
      entryMode: session.entry_mode,
      phase: session.phase,
      status: session.status,
      currentAnswered: Boolean(session.current_answered),
      reason: {
        code: session.reason_code,
        message: session.reason_message
      },
      progress: {
        answered: phaseEvidence.length,
        total,
        label:
          total === null
            ? `${evidence.filter((entry) => entry.mode === "learning").length} learning interactions`
            : `${Math.min(phaseEvidence.length + (session.current_answered ? 0 : 1), total)} of ${total}`
      },
      activity: currentItem
        ? {
            id: currentItem.id,
            mode,
            type: currentItem.type,
            activityType: currentItem.activityType,
            difficulty: currentItem.difficulty,
            prompt: currentItem.prompt,
            context: currentItem.context ?? null,
            instruction: currentItem.instruction ?? null,
            options: currentItem.options,
            knowledgeComponent: component,
            provenance: {
              reviewStatus: currentItem.provenance.reviewStatus,
              version: currentItem.provenance.version
            }
          }
        : null,
      lastResponse:
        latestForItem && session.phase === "learning"
          ? {
              outcome: latestForItem.outcome,
              selectedOptionId: latestForItem.selectedOptionId,
              explanation: currentItem?.explanation ?? null,
              contributedToModel: latestForItem.independentScorable,
              assistanceUsed: latestForItem.assistanceUsed
            }
          : latestForItem
            ? {
                outcome: "recorded",
                selectedOptionId: latestForItem.selectedOptionId,
                explanation: null,
                contributedToModel: latestForItem.independentScorable,
                assistanceUsed: latestForItem.assistanceUsed
              }
            : null,
      helpActions: currentItem
        ? (Object.entries(HELP_LEVELS) as Array<[HelpKind, number]>)
            .filter(([, level]) => level <= maxHelpLevel)
            .map(([kind, level]) => ({ kind, level, label: HELP_LABELS[kind] }))
        : [],
      assistance,
      skills: states.map((state) => {
        const kc = getCatalogKnowledgeComponent(state.knowledgeComponentId);
        return summarizeSkill(state, kc.shortTitle, kc.objective);
      }),
      assessmentPerformance:
        session.phase === "complete"
          ? this.getAssessmentPerformance(session.learner_id, session.goal_id)
          : null,
      modelDisclosure: {
        version: this.learnerModel.version,
        status: this.learnerModel.status,
        note: "The current parameters are explicit engineering defaults and have not yet been scientifically calibrated."
      }
    };
  }

  respond(
    sessionId: string,
    input: { selectedOptionId?: string; skipped?: boolean; responseTimeMs?: number | null }
  ) {
    const session = this.getSessionRow(sessionId);
    if (!session.current_item_id) throw new Error("There is no active activity.");
    if (session.current_answered) throw new Error("This activity already has a recorded response.");
    const item = getCatalogContentItem(session.current_item_id);
    const mode = this.modeForPhase(session.phase);
    if (!mode) throw new Error("This session phase does not accept responses.");
    if (!input.skipped && !item.options.some((option) => option.id === input.selectedOptionId)) {
      throw new Error("Select an available answer or choose ‘I’m not sure’. ");
    }

    const helpRow = this.database
      .prepare(
        "SELECT COUNT(*) AS count, COALESCE(MAX(help_level), 0) AS max_level FROM assistance_events WHERE session_id = ? AND content_item_id = ?"
      )
      .get(session.id, item.id) as { count: number; max_level: number };
    const assistanceUsed = helpRow.count > 0;
    const correct = !input.skipped && input.selectedOptionId === item.correctOptionId;
    const outcome = input.skipped ? "skipped" : correct ? "correct" : "incorrect";
    const previousAnswer = this.database.prepare(
      `SELECT created_at FROM evidence
       WHERE learner_id = ? AND content_item_id = ? AND outcome != 'skipped'
       ORDER BY created_at DESC LIMIT 1`
    ).get(session.learner_id, item.id) as { created_at: string } | undefined;
    const reviewCutoff = Date.now() - SPACED_REVIEW_INTERVAL_DAYS * 86_400_000;
    const spacedReview = Boolean(
      previousAnswer && new Date(previousAnswer.created_at).getTime() <= reviewCutoff
    );
    const firstMeaningfulResponse = !previousAnswer || spacedReview;
    const evidencePolicy = classifyEvidence({
      mode,
      outcome,
      assistanceUsed,
      firstMeaningfulResponse,
      spacedReview
    });
    const independentScorable = evidencePolicy.independentScorable;
    const evidenceId = randomUUID();
    const timestamp = now();
    const modelUpdate = runInTransaction<ModelUpdateSummary | null>(this.database, () => {
      let transactionModelUpdate: ModelUpdateSummary | null = null;
      this.database
        .prepare(
          `INSERT INTO evidence
           (id, learner_id, session_id, content_item_id, knowledge_component_id, mode,
            outcome, selected_option_id, first_meaningful_response, independent_scorable,
            assistance_used, max_assistance_level, response_time_ms, policy_reason, policy_version,
            applied_learning_transition, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          evidenceId,
          session.learner_id,
          session.id,
          item.id,
          item.knowledgeComponentId,
          mode,
          outcome,
          input.selectedOptionId ?? null,
          firstMeaningfulResponse ? 1 : 0,
          independentScorable ? 1 : 0,
          assistanceUsed ? 1 : 0,
          helpRow.max_level,
          input.responseTimeMs ?? null,
          evidencePolicy.reason,
          EVIDENCE_POLICY_VERSION,
          evidencePolicy.applyLearningTransition ? 1 : 0,
          timestamp
        );

      if (evidencePolicy.updateLearnerModel) {
        const state = this.getState(session.learner_id, item.knowledgeComponentId);
        const update = this.learnerModel.update(state.pMastery, {
          correct,
          applyLearningTransition: evidencePolicy.applyLearningTransition
        });
        const nextEvidenceCount = state.independentEvidenceCount + 1;
        const nextCorrectCount = state.independentCorrectCount + (correct ? 1 : 0);
        this.database
          .prepare(
            `UPDATE learner_states SET p_mastery = ?, independent_evidence_count = ?,
             independent_correct_count = ?, model_version = ?, updated_at = ?
             WHERE learner_id = ? AND knowledge_component_id = ?`
          )
          .run(
            update.posteriorAfterLearning,
            nextEvidenceCount,
            nextCorrectCount,
            this.learnerModel.version,
            timestamp,
            session.learner_id,
            item.knowledgeComponentId
          );
        this.database
          .prepare(
            `INSERT INTO learner_state_updates
             (id, learner_id, session_id, evidence_id, knowledge_component_id,
              prior_probability, posterior_observation, posterior_final,
              observation_correct, applied_learning_transition, evidence_policy_reason, evidence_policy_version,
              model_version, model_config_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            randomUUID(),
            session.learner_id,
            session.id,
            evidenceId,
            item.knowledgeComponentId,
            update.prior,
            update.posteriorAfterObservation,
            update.posteriorAfterLearning,
            correct ? 1 : 0,
            evidencePolicy.applyLearningTransition ? 1 : 0,
            evidencePolicy.reason,
            EVIDENCE_POLICY_VERSION,
            this.learnerModel.version,
            JSON.stringify(this.learnerModel.configuration),
            timestamp
          );
        this.database
          .prepare(
            `UPDATE state_disputes SET status = 'completed', resolved_at = ?
             WHERE learner_id = ? AND knowledge_component_id = ? AND status IN ('pending', 'scheduled')`
          )
          .run(timestamp, session.learner_id, item.knowledgeComponentId);
        transactionModelUpdate = {
          knowledgeComponentId: item.knowledgeComponentId,
          prior: update.prior,
          posteriorAfterObservation: update.posteriorAfterObservation,
          posterior: update.posteriorAfterLearning,
          appliedLearningTransition: evidencePolicy.applyLearningTransition,
          evidencePolicyReason: evidencePolicy.reason,
          modelVersion: this.learnerModel.version
        };
      }
      this.database
        .prepare("UPDATE sessions SET current_answered = 1, updated_at = ? WHERE id = ?")
        .run(timestamp, session.id);
      return transactionModelUpdate;
    });

    const assessmentMode = session.phase === "diagnostic" || session.phase === "checkpoint";
    return {
      outcome: assessmentMode ? "recorded" : outcome,
      correct: assessmentMode ? null : correct,
      explanation: assessmentMode ? null : item.explanation,
      contributedToModel: independentScorable,
      assistanceUsed,
      modelUpdate: modelUpdate
        ? {
            ...modelUpdate,
            message: "Independent first-response evidence updated this skill’s learner state."
          }
        : {
            message: input.skipped
              ? "A skipped response is stored as context but does not update BKT."
              : "This assisted response is stored as learning evidence but does not update BKT."
          }
    };
  }

  next(sessionId: string) {
    const session = this.getSessionRow(sessionId);
    const domain = getLearningDomain(session.goal_id);
    if (!session.current_answered) throw new Error("Submit a response before continuing.");
    const evidence = this.getEvidence(session.id);
    const timestamp = now();

    if (session.phase === "diagnostic") {
      const used = evidence.filter((entry) => entry.mode === "diagnostic").map((entry) => entry.contentItemId);
      const latestDiagnostic = evidence.filter((entry) => entry.mode === "diagnostic").at(-1);
      if (latestDiagnostic && (latestDiagnostic.outcome === "incorrect" || latestDiagnostic.outcome === "skipped")) {
        this.applyPlannerDecision(session, "learning");
        return this.getSession(session.id);
      }
      const states = this.getStates(session.learner_id, domain.goal.knowledgeComponentIds);
      const stateByComponent = new Map(states.map((state) => [state.knowledgeComponentId, state]));
      const componentById = new Map(domain.knowledgeComponents.map((component) => [component.id, component]));
      const nextDiagnostic = domain.contentItems
        .filter(
          (entry) => entry.modes.includes("diagnostic") && entry.assessmentEligible && !used.includes(entry.id)
        )
        .sort((left, right) => {
          const leftComponent = componentById.get(left.knowledgeComponentId)!;
          const rightComponent = componentById.get(right.knowledgeComponentId)!;
          const prerequisitesReady = (component: typeof leftComponent) => component.prerequisites.every(
            (id) => (stateByComponent.get(id)?.pMastery ?? 0) >= PLANNER_POLICY.prerequisiteFloor
          );
          const readinessDifference = Number(prerequisitesReady(rightComponent)) - Number(prerequisitesReady(leftComponent));
          if (readinessDifference) return readinessDifference;
          const leftUncertainty = Math.abs((stateByComponent.get(left.knowledgeComponentId)?.pMastery ?? 0.5) - 0.5);
          const rightUncertainty = Math.abs((stateByComponent.get(right.knowledgeComponentId)?.pMastery ?? 0.5) - 0.5);
          return leftUncertainty - rightUncertainty || leftComponent.order - rightComponent.order;
        })[0];
      if (nextDiagnostic) {
        this.setSessionActivity(
          session,
          nextDiagnostic.id,
          "DIAGNOSTIC_BASELINE",
          plannerExplanation("DIAGNOSTIC_BASELINE"),
          timestamp
        );
        this.recordDecision(session.id, session.learner_id, {
          reasonCode: "DIAGNOSTIC_BASELINE",
          knowledgeComponentId: nextDiagnostic.knowledgeComponentId,
          contentItemId: nextDiagnostic.id,
          studentExplanation: plannerExplanation("DIAGNOSTIC_BASELINE"),
          policyVersion: PLANNER_POLICY.version,
          context: { diagnosticCoverageIndex: used.length, adaptiveSelection: true }
        });
      } else {
        this.applyPlannerDecision(session, "learning");
      }
      return this.getSession(session.id);
    }

    if (session.phase === "learning") {
      this.applyPlannerDecision(session, "learning");
      return this.getSession(session.id);
    }

    if (session.phase === "checkpoint") {
      const used = evidence.filter((entry) => entry.mode === "checkpoint").map((entry) => entry.contentItemId);
      const nextCheckpoint = domain.contentItems.find(
        (entry) => entry.modes.includes("checkpoint") && entry.assessmentEligible && !used.includes(entry.id)
      );
      if (nextCheckpoint) {
        this.database
          .prepare(
            `UPDATE sessions SET current_item_id = ?, reason_code = 'INDEPENDENT_CONFIRMATION',
             reason_message = ?, current_answered = 0, updated_at = ? WHERE id = ?`
          )
          .run(
            nextCheckpoint.id,
            "This checkpoint item gathers independent confirmation for another connected skill.",
            timestamp,
            session.id
          );
      } else {
        const states = this.getStates(session.learner_id, domain.goal.knowledgeComponentIds);
        const lowest = [...states].sort((a, b) => a.pMastery - b.pMastery)[0];
        const component = getCatalogKnowledgeComponent(lowest.knowledgeComponentId);
        const explanation = `Your checkpoint is complete. ${component.shortTitle} is the best skill to revisit next as more evidence is gathered.`;
        this.database
          .prepare(
            `UPDATE sessions SET phase = 'complete', status = 'complete', current_item_id = NULL,
             reason_code = 'REVIEW_DUE', reason_message = ?, current_answered = 0, updated_at = ? WHERE id = ?`
          )
          .run(explanation, timestamp, session.id);
        this.database
          .prepare(
            "UPDATE learner_goals SET status = ?, updated_at = ? WHERE learner_id = ? AND goal_id = ?"
          )
          .run(states.every((state) => summarizeSkill(state, "", "").status === "secure") ? "completed" : "active", timestamp, session.learner_id, session.goal_id);
        this.recordDecision(session.id, session.learner_id, {
          reasonCode: "REVIEW_DUE",
          knowledgeComponentId: lowest.knowledgeComponentId,
          contentItemId: null,
          studentExplanation: explanation,
          policyVersion: PLANNER_POLICY.version,
          context: { afterCheckpoint: true }
        });
      }
      return this.getSession(session.id);
    }

    throw new Error("This session cannot advance from its current phase.");
  }

  startCheckpoint(sessionId: string) {
    const session = this.getSessionRow(sessionId);
    if (session.phase !== "checkpoint_ready") throw new Error("The checkpoint is not ready.");
    const domain = getLearningDomain(session.goal_id);
    const first = domain.contentItems.find(
      (entry) => entry.modes.includes("checkpoint") && entry.assessmentEligible
    );
    if (!first) throw new Error("No checkpoint content is available.");
    const timestamp = now();
    this.database
      .prepare(
        `UPDATE sessions SET phase = 'checkpoint', current_item_id = ?,
         reason_code = 'INDEPENDENT_CONFIRMATION', reason_message = ?, current_answered = 0,
         updated_at = ? WHERE id = ?`
      )
      .run(
        first.id,
        "This checkpoint gathers independent evidence across the connected skills.",
        timestamp,
        session.id
      );
    return this.getSession(session.id);
  }

  async requestAssistance(sessionId: string, kind: HelpKind) {
    const session = this.getSessionRow(sessionId);
    if (!session.current_item_id) throw new Error("There is no active activity to help with.");
    const level = HELP_LEVELS[kind];
    if (!level) throw new Error("Unknown help type.");
    const maxLevel = session.phase === "learning" ? 6 : 1;
    if (level > maxLevel) {
      throw new Error(
        "During learning calibration or a milestone review, I can clarify the question format but cannot provide solution help."
      );
    }
    const item = getCatalogContentItem(session.current_item_id);
    const companionReply = await this.companionProvider.provide({ mode: this.modeForPhase(session.phase)!, helpKind: kind, contentItem: item });
    const response = companionReply.message;
    const timestamp = now();
    runInTransaction(this.database, () => {
      const current = this.getSessionRow(sessionId);
      if (current.current_item_id !== item.id || current.current_answered) {
        throw new Error("This activity changed before the requested help was ready. Please use help on the current activity.");
      }
      this.database
        .prepare(
          `INSERT INTO assistance_events
           (id, learner_id, session_id, content_item_id, help_kind, help_level, structured_effect, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'marks_current_response_assisted', ?)`
        )
        .run(randomUUID(), session.learner_id, session.id, item.id, kind, level, timestamp);
      this.database
        .prepare(
          `INSERT INTO conversation_messages
           (id, learner_id, session_id, content_item_id, role, body, created_at)
           VALUES (?, ?, ?, ?, 'learner', ?, ?), (?, ?, ?, ?, 'companion', ?, ?)`
        )
        .run(
          randomUUID(),
          session.learner_id,
          session.id,
          item.id,
          HELP_LABELS[kind],
          timestamp,
          randomUUID(),
          session.learner_id,
          session.id,
          item.id,
          response,
          timestamp
        );
    });
    return {
      kind,
      level,
      response,
      provider: companionReply.provider,
      groundedInContentVersion: companionReply.groundedInContentVersion,
      educationalIntegrity: {
        currentResponseBecomesAssisted: true,
        bktUpdateEligible: false
      }
    };
  }

  getProgress(learnerId: string) {
    const learner = this.getLearner(learnerId);
    const goalRecord = this.database
      .prepare(
        `SELECT goal_id, status, updated_at FROM learner_goals
         WHERE learner_id = ? ORDER BY updated_at DESC LIMIT 1`
      )
      .get(learnerId) as { goal_id: string; status: string; updated_at: string } | undefined;
    const domain = goalRecord ? getLearningDomain(goalRecord.goal_id) : null;
    const hasAvailableDomain = getDomainsForGrade(learner.grade).length > 0;
    const states = domain
      ? this.getStates(learnerId, domain.goal.knowledgeComponentIds)
      : [];
    const skills = states.map((state) => {
      const kc = getCatalogKnowledgeComponent(state.knowledgeComponentId);
      return summarizeSkill(state, kc.shortTitle, kc.objective);
    });
    const latestDecision = this.database
      .prepare(
        "SELECT reason_code, knowledge_component_id, student_explanation, created_at FROM planner_decisions WHERE learner_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(learnerId) as
      | {
          reason_code: PlannerReasonCode;
          knowledge_component_id: string | null;
          student_explanation: string;
          created_at: string;
        }
      | undefined;
    const counts = this.database
      .prepare(
        `SELECT COUNT(*) AS total,
          COALESCE(SUM(independent_scorable), 0) AS independent,
          COALESCE(SUM(assistance_used), 0) AS assisted
         FROM evidence WHERE learner_id = ?`
      )
      .get(learnerId) as { total: number; independent: number; assisted: number };
    const completedSessions = this.database
      .prepare("SELECT COUNT(*) AS count FROM sessions WHERE learner_id = ? AND status = 'complete'")
      .get(learnerId) as { count: number };
    return {
      goal: domain?.goal ?? null,
      skills,
      evidenceSummary: {
        totalInteractions: counts.total,
        independentScorableResponses: counts.independent,
        assistedResponses: counts.assisted,
        completedSessions: completedSessions.count
      },
      goalSummary: {
        totalSkills: skills.length,
        secureSkills: skills.filter((skill) => skill.status === "secure").length,
        developingSkills: skills.filter((skill) => skill.status === "developing").length,
        needsSupportSkills: skills.filter((skill) => skill.status === "needs_support").length,
        limitedEvidenceSkills: skills.filter((skill) => skill.status === "limited_evidence").length
      },
      reviewNeeds: skills
        .filter((skill) => skill.status === "needs_support" || skill.status === "developing")
        .map((skill) => ({ id: skill.id, title: skill.title, status: skill.status })),
      recentActivity: this.getRecentActivity(learnerId, 5),
      assessmentPerformance: domain
        ? this.getAssessmentPerformance(learnerId, domain.goal.id)
        : { attempts: [], comparison: null },
      recommendation: !domain
        ? {
            reasonCode: hasAvailableDomain ? "INSUFFICIENT_EVIDENCE" : "NO_SUITABLE_CONTENT",
            skill: null,
            message: hasAvailableDomain
              ? "Choose a learning goal to establish your starting point."
              : "Explore the learning areas while content for this grade is prepared.",
            createdAt: null
          }
        : latestDecision
        ? {
            reasonCode: latestDecision.reason_code,
            skill: latestDecision.knowledge_component_id
              ? getCatalogKnowledgeComponent(latestDecision.knowledge_component_id).shortTitle
              : null,
            message: latestDecision.reason_code === "NO_SUITABLE_CONTENT"
              ? "You completed the available practice in this cycle. Reopen the path when you are ready to continue."
              : plannerExplanation(latestDecision.reason_code),
            createdAt: latestDecision.created_at
          }
        : {
            reasonCode: "INSUFFICIENT_EVIDENCE",
            skill: null,
            message: "Begin your learning calibration so AI-Charya can recommend the right starting point.",
            createdAt: null
          },
      model: {
        version: this.learnerModel.version,
        status: this.learnerModel.status,
        parametersValidated: false
      }
    };
  }

  disputeState(learnerId: string, knowledgeComponentId: string, note: string) {
    this.getLearner(learnerId);
    getCatalogKnowledgeComponent(knowledgeComponentId);
    const normalizedNote = note.trim() || "Learner requested a fresh skill check.";
    const existing = this.database
      .prepare(
        `SELECT id, status, created_at FROM state_disputes
         WHERE learner_id = ? AND knowledge_component_id = ? AND status IN ('pending', 'scheduled')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(learnerId, knowledgeComponentId) as
      | { id: string; status: string; created_at: string }
      | undefined;
    const id = existing?.id ?? randomUUID();
    const createdAt = existing?.created_at ?? now();
    if (!existing) {
      this.database
        .prepare(
          `INSERT INTO state_disputes
           (id, learner_id, knowledge_component_id, status, note, created_at, resolved_at)
           VALUES (?, ?, ?, 'pending', ?, ?, NULL)`
        )
        .run(id, learnerId, knowledgeComponentId, normalizedNote, createdAt);
    }
    return {
      status: "reassessment_requested",
      id,
      knowledgeComponentId,
      note: normalizedNote,
      createdAt,
      message: "Your request is saved. The planner will prioritise a fresh independent skill check."
    };
  }

  private getAssessmentPerformance(learnerId: string, goalId: string) {
    const rows = this.database
      .prepare(
        `SELECT e.session_id, e.mode, e.outcome, e.assistance_used,
                e.knowledge_component_id, e.created_at
         FROM evidence e
         JOIN sessions s ON s.id = e.session_id
         WHERE e.learner_id = ? AND s.goal_id = ?
           AND e.mode IN ('diagnostic', 'checkpoint')
         ORDER BY e.created_at, e.rowid`
      )
      .all(learnerId, goalId) as unknown as Array<{
        session_id: string;
        mode: "diagnostic" | "checkpoint";
        outcome: EvidenceRecord["outcome"];
        assistance_used: number;
        knowledge_component_id: string;
        created_at: string;
      }>;
    const grouped = new Map<string, {
      id: string;
      mode: "diagnostic" | "checkpoint";
      correct: number;
      total: number;
      assistedExcluded: number;
      skillIds: Set<string>;
      completedAt: string;
    }>();
    for (const row of rows) {
      const key = `${row.session_id}:${row.mode}`;
      const attempt = grouped.get(key) ?? {
        id: key,
        mode: row.mode,
        correct: 0,
        total: 0,
        assistedExcluded: 0,
        skillIds: new Set<string>(),
        completedAt: row.created_at
      };
      attempt.completedAt = row.created_at;
      if (row.assistance_used) {
        attempt.assistedExcluded += 1;
      } else {
        attempt.total += 1;
        attempt.correct += row.outcome === "correct" ? 1 : 0;
        attempt.skillIds.add(row.knowledge_component_id);
      }
      grouped.set(key, attempt);
    }
    const attempts = [...grouped.values()].map((attempt) => ({
      id: attempt.id,
      kind: attempt.mode === "diagnostic" ? "starting_check" : "milestone_review",
      label: attempt.mode === "diagnostic" ? "Starting check" : "Milestone review",
      correct: attempt.correct,
      total: attempt.total,
      score: attempt.total ? Math.round((attempt.correct / attempt.total) * 100) : null,
      skillsRepresented: attempt.skillIds.size,
      skillIds: [...attempt.skillIds],
      assistedExcluded: attempt.assistedExcluded,
      completedAt: attempt.completedAt
    }));
    const baseline = attempts.find((attempt) => attempt.kind === "starting_check") ?? null;
    const latestReview = [...attempts].reverse().find((attempt) => attempt.kind === "milestone_review") ?? null;
    const sharedSkillCount = baseline && latestReview
      ? baseline.skillIds.filter((id) => latestReview.skillIds.includes(id)).length
      : 0;
    return {
      attempts,
      comparison: baseline && latestReview && baseline.score !== null && latestReview.score !== null
        ? {
            baseline,
            latestReview,
            change: latestReview.score - baseline.score,
            sharedSkillCount
          }
        : null
    };
  }

  private getRecentActivity(learnerId: string, limit: number) {
    const rows = this.database
      .prepare(
        `SELECT content_item_id, knowledge_component_id, mode, outcome, assistance_used, created_at
         FROM evidence WHERE learner_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`
      )
      .all(learnerId, limit) as unknown as Array<{
      content_item_id: string;
      knowledge_component_id: string;
      mode: ActivityMode;
      outcome: EvidenceRecord["outcome"];
      assistance_used: number;
      created_at: string;
    }>;

    return rows.map((row) => {
      const component = getCatalogKnowledgeComponent(row.knowledge_component_id);
      const contentItem = getCatalogContentItem(row.content_item_id);
      const domain = getDomainForContentItem(row.content_item_id);
      const title =
        row.mode === "diagnostic"
          ? "Learning calibration response recorded"
          : row.mode === "checkpoint"
            ? "Milestone review response recorded"
            : `Practised ${component.shortTitle}`;
      const detail =
        row.mode !== "learning"
          ? `${component.shortTitle} · result kept within the assessment flow`
          : row.assistance_used
            ? "Completed with companion support"
            : row.outcome === "correct"
              ? "Independent practice completed"
              : row.outcome === "skipped"
                ? "Response skipped; you can revisit this skill"
                : "Practice attempt recorded for review";
      return {
        id: `${row.content_item_id}-${row.created_at}`,
        title,
        detail,
        subject: domain.goal.subject,
        topic: domain.goal.topic,
        activityType: contentItem.activityType,
        mode: row.mode,
        assisted: Boolean(row.assistance_used),
        createdAt: row.created_at
      };
    });
  }

  private getEngagement(learnerId: string) {
    const learning = this.database
      .prepare(
        `SELECT COUNT(*) AS interactions,
          COALESCE(SUM(CASE WHEN independent_scorable = 1 AND outcome = 'correct' THEN 1 ELSE 0 END), 0) AS independent_correct,
          COALESCE(SUM(CASE WHEN independent_scorable = 1 THEN 1 ELSE 0 END), 0) AS independent_total
         FROM evidence WHERE learner_id = ?`
      )
      .get(learnerId) as { interactions: number; independent_correct: number; independent_total: number };
    const sessions = this.database
      .prepare("SELECT COUNT(*) AS count FROM sessions WHERE learner_id = ? AND status = 'complete'")
      .get(learnerId) as { count: number };
    const challenges = this.database
      .prepare(
        `SELECT COUNT(*) AS responses,
          COALESCE(SUM(correct), 0) AS correct
         FROM challenge_responses WHERE learner_id = ?`
      )
      .get(learnerId) as { responses: number; correct: number };
    const activityDays = this.database
      .prepare(
        `SELECT day FROM (
          SELECT substr(created_at, 1, 10) AS day FROM evidence WHERE learner_id = ?
          UNION
          SELECT substr(created_at, 1, 10) AS day FROM challenge_responses WHERE learner_id = ?
        ) ORDER BY day DESC`
      )
      .all(learnerId, learnerId) as unknown as Array<{ day: string }>;
    const daySet = new Set(activityDays.map((entry) => entry.day));
    let streakDays = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    const todayKey = cursor.toISOString().slice(0, 10);
    if (!daySet.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streakDays += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const weeklyLearningDays = activityDays.filter((entry) => entry.day >= weekStart.toISOString().slice(0, 10)).length;
    const xp = learning.interactions * 10 + learning.independent_correct * 5 + sessions.count * 25 + challenges.correct * 3;
    const accuracy = learning.independent_total
      ? Math.round((learning.independent_correct / learning.independent_total) * 100)
      : 0;
    const milestone = Math.max(100, Math.ceil((xp + 1) / 100) * 100);
    const achievements = [
      {
        id: "first-step",
        title: "First step",
        description: "Begin a structured learning goal.",
        state: learning.interactions > 0 ? "earned" : "in_progress"
      },
      {
        id: "steady-start",
        title: "Steady start",
        description: "Return to learn across three different days.",
        state: activityDays.length >= 3 ? "earned" : "in_progress"
      },
      {
        id: "independent-thinker",
        title: "Independent thinker",
        description: "Complete five independent learning responses.",
        state: learning.independent_total >= 5 ? "earned" : "in_progress"
      }
    ];
    const featuredAchievement = achievements.find((entry) => entry.state === "earned") ?? achievements[0];
    return {
      xp,
      accuracy,
      streakDays,
      weeklyLearningDays,
      weeklyLearningTarget: 5,
      dailyGoal: { questionTarget: 12, quizTarget: 1 },
      nextMilestone: { label: `${milestone} XP`, remainingXp: milestone - xp },
      featuredAchievement,
      achievements,
      boundary: {
        affectsLearnerModel: false,
        affectsPlanner: false,
        affectsAssessment: false
      }
    };
  }

  private getTodayGoal(learnerId: string) {
    const activeGoal = this.database
      .prepare("SELECT 1 AS present FROM learner_goals WHERE learner_id = ? LIMIT 1")
      .get(learnerId) as { present: number } | undefined;
    if (!activeGoal) {
      return {
        status: "not_set",
        completionPercent: 0,
        topicsCovered: 0,
        questionsCompleted: 0,
        questionTarget: 0,
        quizzesCompleted: 0,
        quizTarget: 0,
        quizRemaining: 0
      };
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = this.database
      .prepare(
        `SELECT knowledge_component_id, mode FROM evidence
         WHERE learner_id = ? AND created_at >= ? ORDER BY created_at ASC`
      )
      .all(learnerId, start.toISOString()) as unknown as Array<{
      knowledge_component_id: string;
      mode: ActivityMode;
    }>;
    const topicsCovered = new Set(rows.map((row) => row.knowledge_component_id)).size;
    const questionsCompleted = rows.length;
    const quizCompleted = rows.some((row) => row.mode === "checkpoint");
    const questionTarget = 12;
    const quizTarget = 1;
    const questionProgress = Math.min(questionsCompleted, questionTarget) / questionTarget;
    const quizProgress = quizCompleted ? 1 : 0;
    return {
      status: "active",
      completionPercent: Math.round((questionProgress * 0.8 + quizProgress * 0.2) * 100),
      topicsCovered,
      questionsCompleted,
      questionTarget,
      quizzesCompleted: quizCompleted ? 1 : 0,
      quizTarget,
      quizRemaining: quizCompleted ? 0 : 1
    };
  }

  private getWeeklyActivity(learnerId: string) {
    const rows = this.database
      .prepare(
        `SELECT created_at FROM evidence
         WHERE learner_id = ? AND created_at >= datetime('now', '-6 days')
         ORDER BY created_at`
      )
      .all(learnerId) as unknown as Array<{ created_at: string }>;
    const countByDate = new Map<string, number>();
    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      countByDate.set(day, (countByDate.get(day) ?? 0) + 1);
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        label: date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).slice(0, 2),
        interactions: countByDate.get(key) ?? 0
      };
    });
    return {
      days,
      totalInteractions: days.reduce((total, day) => total + day.interactions, 0),
      activeDays: days.filter((day) => day.interactions > 0).length
    };
  }

  private applyPlannerDecision(session: SessionRow, phase: "learning") {
    const domain = getLearningDomain(session.goal_id);
    const states = this.getStates(session.learner_id, domain.goal.knowledgeComponentIds);
    const evidence = this.getEvidence(session.id);
    const usedContentItemIds = evidence.map((entry) => entry.contentItemId);
    const nextDecision = chooseNextActivity({
      goal: domain.goal,
      knowledgeComponents: domain.knowledgeComponents,
      contentItems: domain.contentItems,
      learnerStates: states,
      evidence,
      usedContentItemIds,
      reassessmentRequests: this.getReassessmentRequests(session.learner_id).filter((request) => domain.goal.knowledgeComponentIds.includes(request.knowledgeComponentId))
    });
    const timestamp = now();
    if (nextDecision.reasonCode === "CHECKPOINT_READY") {
      this.database
        .prepare(
          `UPDATE sessions SET phase = 'checkpoint_ready', current_item_id = NULL,
           reason_code = ?, reason_message = ?, current_answered = 0, updated_at = ? WHERE id = ?`
        )
        .run(nextDecision.reasonCode, nextDecision.studentExplanation, timestamp, session.id);
    } else if (nextDecision.reasonCode === "NO_SUITABLE_CONTENT") {
      const recoveryMessage =
        "You’ve completed the available practice for this cycle. Your learning map shows which skill to revisit next.";
      this.database
        .prepare(
          `UPDATE sessions SET phase = 'complete', status = 'complete', current_item_id = NULL, reason_code = ?,
           reason_message = ?, current_answered = 0, updated_at = ? WHERE id = ?`
        )
        .run(nextDecision.reasonCode, recoveryMessage, timestamp, session.id);
      this.database
        .prepare(
          "UPDATE learner_goals SET status = 'active', updated_at = ? WHERE learner_id = ? AND goal_id = ?"
        )
        .run(timestamp, session.learner_id, session.goal_id);
      nextDecision.studentExplanation = recoveryMessage;
      nextDecision.context = { ...nextDecision.context, cycleEnded: "content_exhausted_without_readiness" };
    } else {
      this.database
        .prepare(
          `UPDATE sessions SET phase = ?, current_item_id = ?, reason_code = ?,
           reason_message = ?, current_answered = 0, updated_at = ? WHERE id = ?`
        )
        .run(
          phase,
          nextDecision.contentItemId,
          nextDecision.reasonCode,
          nextDecision.studentExplanation,
          timestamp,
          session.id
        );
    }
    this.recordDecision(session.id, session.learner_id, nextDecision);
  }

  private recordDecision(sessionId: string, learnerId: string, decision: PlannerDecision) {
    this.database
      .prepare(
        `INSERT INTO planner_decisions
         (id, learner_id, session_id, reason_code, knowledge_component_id, content_item_id,
          student_explanation, policy_version, context_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        learnerId,
        sessionId,
        decision.reasonCode,
        decision.knowledgeComponentId,
        decision.contentItemId,
        decision.studentExplanation,
        decision.policyVersion,
        JSON.stringify(decision.context),
        now()
      );
  }

  private setSessionActivity(
    session: SessionRow,
    contentItemId: string,
    reasonCode: PlannerReasonCode,
    reasonMessage: string,
    timestamp: string
  ) {
    this.database
      .prepare(
        `UPDATE sessions SET current_item_id = ?, reason_code = ?, reason_message = ?,
         current_answered = 0, updated_at = ? WHERE id = ?`
      )
      .run(contentItemId, reasonCode, reasonMessage, timestamp, session.id);
  }

  private getSessionRow(sessionId: string): SessionRow {
    const session = this.database.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as
      | SessionRow
      | undefined;
    if (!session) throw new Error("Learning session not found.");
    return session;
  }

  private getStates(learnerId: string, knowledgeComponentIds?: string[]): LearnerState[] {
    const rows = this.database
      .prepare("SELECT * FROM learner_states WHERE learner_id = ? ORDER BY knowledge_component_id")
      .all(learnerId) as unknown as StateRow[];
    const allComponents = LEARNING_DOMAINS.flatMap((domain) => domain.knowledgeComponents);
    const order = new Map(allComponents.map((component, index) => [component.id, index]));
    return rows
      .map(asLearnerState)
      .filter((state) => !knowledgeComponentIds || knowledgeComponentIds.includes(state.knowledgeComponentId))
      .sort(
        (left, right) =>
          (order.get(left.knowledgeComponentId) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.knowledgeComponentId) ?? Number.MAX_SAFE_INTEGER)
      );
  }

  private getState(learnerId: string, knowledgeComponentId: string): LearnerState {
    const row = this.database
      .prepare(
        "SELECT * FROM learner_states WHERE learner_id = ? AND knowledge_component_id = ?"
      )
      .get(learnerId, knowledgeComponentId) as StateRow | undefined;
    if (!row) throw new Error("Learner state not initialized.");
    return asLearnerState(row);
  }

  private getEvidence(sessionId: string): EvidenceRecord[] {
    const rows = this.database
      .prepare("SELECT * FROM evidence WHERE session_id = ? ORDER BY created_at, rowid")
      .all(sessionId) as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      learnerId: row.learner_id as string,
      sessionId: row.session_id as string,
      contentItemId: row.content_item_id as string,
      knowledgeComponentId: row.knowledge_component_id as string,
      mode: row.mode as ActivityMode,
      outcome: row.outcome as EvidenceRecord["outcome"],
      selectedOptionId: row.selected_option_id as string | null,
      firstMeaningfulResponse: Boolean(row.first_meaningful_response),
      independentScorable: Boolean(row.independent_scorable),
      assistanceUsed: Boolean(row.assistance_used),
      maxAssistanceLevel: row.max_assistance_level as number,
      responseTimeMs: row.response_time_ms as number | null,
      createdAt: row.created_at as string
    }));
  }

  private getAssistance(sessionId: string, contentItemId: string) {
    const events = this.database
      .prepare(
        "SELECT help_kind, help_level, structured_effect, created_at FROM assistance_events WHERE session_id = ? AND content_item_id = ? ORDER BY created_at, rowid"
      )
      .all(sessionId, contentItemId) as unknown as Array<Record<string, unknown>>;
    const messages = this.database
      .prepare(
        "SELECT role, body, created_at FROM conversation_messages WHERE session_id = ? AND content_item_id = ? ORDER BY created_at, rowid"
      )
      .all(sessionId, contentItemId) as unknown as Array<Record<string, unknown>>;
    return {
      events: events.map((event) => ({
        kind: event.help_kind,
        level: event.help_level,
        structuredEffect: event.structured_effect,
        createdAt: event.created_at
      })),
      messages: messages.map((message) => ({
        role: message.role,
        body: message.body,
        createdAt: message.created_at
      }))
    };
  }

  private getReassessmentRequests(learnerId: string): ReassessmentRequest[] {
    const rows = this.database
      .prepare(
        `SELECT id, learner_id, knowledge_component_id, status, note, created_at
         FROM state_disputes WHERE learner_id = ? AND status IN ('pending', 'scheduled')
         ORDER BY created_at`
      )
      .all(learnerId) as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      learnerId: row.learner_id as string,
      knowledgeComponentId: row.knowledge_component_id as string,
      status: row.status as ReassessmentRequest["status"],
      note: row.note as string,
      createdAt: row.created_at as string
    }));
  }

  private modeForPhase(phase: SessionPhase): ActivityMode | null {
    if (phase === "diagnostic") return "diagnostic";
    if (phase === "learning") return "learning";
    if (phase === "checkpoint") return "checkpoint";
    return null;
  }
}
