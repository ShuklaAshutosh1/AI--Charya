# AI-Charya

AI-Charya is a learner-first adaptive learning platform. This repository contains a working adaptive-learning foundation for Grades 1–8, with onboarding, goal selection, diagnostic evidence, learner-state estimation, adaptive planning, contextual assistance, checkpoint assessment, and progress.

Every grade from 1 through 8 has one populated foundation path in Mathematics, Science, English, Social Science, Computer Science, and Hindi. These 48 paths exercise the real adaptive loop; they are focused entry paths rather than a claim of complete year-long curriculum coverage. Grade 6 Fractions remains the deepest populated domain.

The student-facing product surface includes a learner dashboard, a grade-aware learning-area catalog, evidence-based progress, persistent preferences, challenges, a practice leaderboard, and profile/privacy controls. Mathematics, Science, English, Social Science, Computer Science, and Hindi each expose the foundation path for the learner's grade. Personal XP, streaks, accuracy, and achievements are derived from stored activity. Engagement remains isolated from evidence, learner-state updates, assessment, planning, and recommendations.

Challenge adds deterministic 1v1 and Rapid Fire engagement practice using the Fractions question bank. Matches and responses are persisted through a dedicated server boundary, use computer-controlled practice opponents, write no learning evidence, and never enter BKT, assessment, or planner decisions.

## Run locally

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm build
pnpm start
```

Open `http://127.0.0.1:4173`.

For development, `pnpm dev` rebuilds the client and starts the TypeScript server. Run the verification suite with:

```bash
pnpm test
```

Learner data is stored locally in `data/ai-charya.db`. The directory is intentionally ignored by version control.

## Implemented product loop

1. Create a minimal learner profile.
2. Choose a populated foundation goal for the learner's grade and subject.
3. Complete a diagnostic covering each knowledge component.
4. Initialize and update a skill-level learner state.
5. Let the deterministic planner choose the next learning activity and record its reason.
6. Request bounded companion help when needed.
7. Store assisted outcomes separately and exclude them from the initial BKT update rule.
8. Reach an independent checkpoint when evidence is sufficient.
9. Review skill states, evidence counts, and the next recommendation.
10. Challenge an inferred state without overwriting evidence or mastery.

## Architectural boundaries

- `src/content` contains versioned learning goals, knowledge components, activities, provenance, review state, hints, and explanations.
- `src/domain/learnerModel.ts` defines the replaceable learner-model boundary. The current implementation is versioned provisional BKT.
- `src/domain/planner.ts` contains the explainable policy-driven activity planner. Learner-state estimation and activity selection are separate.
- `src/domain/companion.ts` defines the companion-provider boundary. The first provider returns reviewed, item-grounded support; it has no authority over learner state or planning.
- `server/learningService.ts` orchestrates sessions, evidence, model updates, planner decisions, checkpoints, and progress.
- `server/database.ts` owns persistent records for learners, contexts, states, evidence, assistance events, conversations, and planner decisions.
- `server/challengeService.ts` owns competitive-practice matches and guarantees their separation from adaptive evidence.
- `src/pages` implements the dark student experience and its realistic states.

The full reasoning chain, equations, policy order, and worked traces are documented in [`docs/adaptive-learning.md`](docs/adaptive-learning.md).

## Evidence semantics

The initial BKT implementation accepts only an independent, scorable first meaningful response. Hints, structured assistance, worked support, skips, and response time remain separately represented. Assistance can affect planner policy, but it is not converted into an invented BKT formula.

The current BKT parameters and planner thresholds are explicit, versioned engineering defaults. They are not scientifically validated and are not shown to learners as precise mastery percentages.

## Content status

All 48 foundation paths are checked by automated quality gates for unique identifiers, complete diagnostic/learning/checkpoint coverage, valid answers, and distinct single-answer choices. Every path also completes successfully through the learner service in automated tests. The Fractions domain has additional mathematical-equivalence checks and a deeper skill decomposition.

Content is original foundation material with candidate India/NCERT/CBSE alignment. Educator review and authoritative curriculum mapping are still required before any path is represented as approved or comprehensive curriculum coverage.

## Current release boundaries

- Local learner profiles receive a secret access token; protected learner, session, preference, and challenge APIs require it. Full guardian and institutional onboarding remain outside this slice.
- Existing SQLite learner records are retained when the supported grade range is expanded; the migration creates a safety backup before changing the learner grade constraint.
- The companion currently uses reviewed structured support instead of an external general-purpose model. The provider boundary is ready for a controlled future processor.
- Exact curriculum approval, BKT calibration, planner calibration, retention periods, and external-provider selection remain deferred as agreed.
- Node’s built-in SQLite API may emit an experimental warning in the current runtime. Storage access is isolated so a production database adapter can replace it without changing the learner model or planner.
