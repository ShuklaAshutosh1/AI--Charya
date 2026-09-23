import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type AppDatabase = DatabaseSync;

export function runInTransaction<T>(database: AppDatabase, work: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function ensureColumn(database: AppDatabase, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function createDatabase(filePath = resolve("data", "ai-charya.db")): AppDatabase {
  if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true });
  const database = new DatabaseSync(filePath);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS learners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 8),
      context TEXT NOT NULL DEFAULT 'independent',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learner_goals (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      goal_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(learner_id, goal_id)
    );

    CREATE TABLE IF NOT EXISTS learner_access (
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      goal_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      status TEXT NOT NULL,
      current_item_id TEXT,
      reason_code TEXT NOT NULL,
      reason_message TEXT NOT NULL,
      current_answered INTEGER NOT NULL DEFAULT 0,
      entry_mode TEXT NOT NULL DEFAULT 'check' CHECK (entry_mode IN ('learn', 'check')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learner_states (
      learner_id TEXT NOT NULL REFERENCES learners(id),
      knowledge_component_id TEXT NOT NULL,
      p_mastery REAL NOT NULL,
      independent_evidence_count INTEGER NOT NULL,
      independent_correct_count INTEGER NOT NULL,
      model_version TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (learner_id, knowledge_component_id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      content_item_id TEXT NOT NULL,
      knowledge_component_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      outcome TEXT NOT NULL,
      selected_option_id TEXT,
      first_meaningful_response INTEGER NOT NULL,
      independent_scorable INTEGER NOT NULL,
      assistance_used INTEGER NOT NULL,
      max_assistance_level INTEGER NOT NULL,
      response_time_ms INTEGER,
      policy_reason TEXT NOT NULL DEFAULT 'LEGACY_UNCLASSIFIED',
      policy_version TEXT NOT NULL DEFAULT 'legacy',
      applied_learning_transition INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, content_item_id)
    );

    CREATE TABLE IF NOT EXISTS assistance_events (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      content_item_id TEXT NOT NULL,
      help_kind TEXT NOT NULL,
      help_level INTEGER NOT NULL,
      structured_effect TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      content_item_id TEXT NOT NULL,
      role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS planner_decisions (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      reason_code TEXT NOT NULL,
      knowledge_component_id TEXT,
      content_item_id TEXT,
      student_explanation TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      context_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learner_state_updates (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      evidence_id TEXT NOT NULL REFERENCES evidence(id),
      knowledge_component_id TEXT NOT NULL,
      prior_probability REAL NOT NULL,
      posterior_observation REAL NOT NULL,
      posterior_final REAL NOT NULL,
      observation_correct INTEGER NOT NULL,
      applied_learning_transition INTEGER NOT NULL,
      evidence_policy_reason TEXT NOT NULL,
      evidence_policy_version TEXT NOT NULL,
      model_version TEXT NOT NULL,
      model_config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(evidence_id)
    );

    CREATE TABLE IF NOT EXISTS state_disputes (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      knowledge_component_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS learner_preferences (
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      interface_language TEXT NOT NULL DEFAULT 'English',
      session_length_minutes INTEGER NOT NULL DEFAULT 20,
      reduce_motion INTEGER NOT NULL DEFAULT 0,
      larger_text INTEGER NOT NULL DEFAULT 0,
      private_profile INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_matches (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      goal_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('one_v_one', 'rapid_fire')),
      status TEXT NOT NULL CHECK (status IN ('active', 'complete')),
      question_ids_json TEXT NOT NULL,
      participants_json TEXT NOT NULL,
      participant_scores_json TEXT NOT NULL,
      current_question_index INTEGER NOT NULL DEFAULT 0,
      current_answered INTEGER NOT NULL DEFAULT 0,
      learner_score INTEGER NOT NULL DEFAULT 0,
      last_feedback_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS challenge_responses (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES challenge_matches(id) ON DELETE CASCADE,
      learner_id TEXT NOT NULL REFERENCES learners(id),
      content_item_id TEXT NOT NULL,
      selected_option_id TEXT,
      correct INTEGER NOT NULL,
      response_time_ms INTEGER,
      score_delta INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(match_id, content_item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_learner_kc
      ON evidence(learner_id, knowledge_component_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_assistance_session_item
      ON assistance_events(session_id, content_item_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_learner
      ON sessions(learner_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_state_updates_learner_kc
      ON learner_state_updates(learner_id, knowledge_component_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_state_disputes_learner_status
      ON state_disputes(learner_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_challenge_matches_learner
      ON challenge_matches(learner_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_challenge_responses_match
      ON challenge_responses(match_id, created_at);
  `);
  ensureColumn(database, "evidence", "policy_reason", "TEXT NOT NULL DEFAULT 'LEGACY_UNCLASSIFIED'");
  ensureColumn(database, "evidence", "policy_version", "TEXT NOT NULL DEFAULT 'legacy'");
  ensureColumn(database, "evidence", "applied_learning_transition", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "learner_state_updates", "evidence_policy_version", "TEXT NOT NULL DEFAULT 'legacy'");
  ensureColumn(database, "sessions", "entry_mode", "TEXT NOT NULL DEFAULT 'check'");
  migrateGradeRange(database, filePath);
  return database;
}

export function migrateGradeRange(database: AppDatabase, filePath = ":memory:"): void {
  const table = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='learners'").get() as {sql: string};
  if (!/grade IN \(6, 7, 8\)/.test(table.sql)) return;
  // A SQLite snapshot includes committed WAL data, unlike copying the db file.
  if (filePath !== ":memory:") database.prepare("VACUUM INTO ?").run(`${filePath}.before-grade-expansion-${Date.now()}.bak`);
  database.exec("PRAGMA foreign_keys = OFF");
  try {
    runInTransaction(database, () => {
      database.exec(`
        CREATE TABLE learners_expanded (
          id TEXT PRIMARY KEY, name TEXT NOT NULL,
          grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 8),
          context TEXT NOT NULL DEFAULT 'independent', created_at TEXT NOT NULL
        );
        INSERT INTO learners_expanded SELECT id, name, grade, context, created_at FROM learners;
        DROP TABLE learners;
        ALTER TABLE learners_expanded RENAME TO learners;
      `);
      if (database.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Grade migration failed its relationship check.");
    });
  } finally { database.exec("PRAGMA foreign_keys = ON"); }
}
