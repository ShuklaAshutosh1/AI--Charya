# AI-Charya adaptive-learning specification

This document explains the implemented adaptive logic in a form suitable for engineering review. It describes the current, versioned model; it does not claim that provisional parameters have been scientifically calibrated.

## Responsibility boundaries

The runtime follows one traceable chain:

`interaction → evidence policy → learner-model update → adaptive need → content choice → recorded decision`

Each stage owns one concern:

- Content defines a goal, knowledge components, prerequisites, activities, difficulty, permitted modes, answers, help, provenance, and assessment eligibility.
- Evidence policy decides whether an interaction is eligible to update the knowledge model.
- The learner model estimates knowledge for one component. It does not select content.
- The planner selects the next activity from state, goals, prerequisites, evidence, help usage, review timing, and available content.
- The companion gives bounded, content-grounded help. It cannot write mastery or call the planner.
- Engagement and challenges are separate. They do not create adaptive evidence.

## Knowledge representation

The current Fractions domain uses four components:

1. fraction meaning;
2. equivalent fractions;
3. comparison and ordering;
4. like-denominator addition and subtraction.

Each component has its own probability, independent-response counts, prerequisites, and update history. This prevents a single total score from hiding different strengths and gaps.

The content decomposition is replaceable data. The adaptive services consume a generic learning-domain contract and do not import Fractions directly.

## Evidence eligibility

Version `evidence-policy-v0.2-provisional` applies these rules:

| Interaction | Stored as evidence | Updates knowledge model | Learning transition |
|---|---:|---:|---:|
| First independent correct response | yes | yes | practice only |
| First independent incorrect response | yes | yes | practice only |
| Response after any companion help | yes | no | no |
| Skip / “I’m not sure” | yes | no | no |
| Unsupported partial response | yes | no | no |
| Later retry of the same item | retained separately by policy | no | no |

Response time and maximum help level are recorded but are not converted into an unsupported mastery formula. They may inform deterministic planner rules.

## Bayesian Knowledge Tracing

The replaceable learner-model boundary currently uses two-state Bayesian Knowledge Tracing. For prior mastery probability `P(L)`, guess probability `P(G)`, and slip probability `P(S)`:

Correct observation:

`P(L | correct) = P(L)(1-P(S)) / [P(L)(1-P(S)) + (1-P(L))P(G)]`

Incorrect observation:

`P(L | incorrect) = P(L)P(S) / [P(L)P(S) + (1-P(L))(1-P(G))]`

During learning practice only, the model then applies a learning opportunity:

`P(L next) = P(L | observation) + (1-P(L | observation))P(T)`

Starting checks and checkpoints update from the observation but do not apply `P(T)`, because an assessment response is evidence, not an assumed learning opportunity.

Current explicit configuration (`bkt-core-v0.2-provisional`):

- initial knowledge `P(L0) = 0.35`
- learning transition `P(T) = 0.15`
- guess `P(G) = 0.20`
- slip `P(S) = 0.10`

Every eligible update records the prior, observation posterior, final posterior, whether the learning transition was applied, evidence-policy reason and version, model version, and complete parameter snapshot. This is the audit lineage for explaining or recomputing a state.

## Adaptive planning policy

The deterministic planner is separate from BKT and uses `planner-policy-v0.2-provisional`. It evaluates needs in this order:

1. learner-requested reassessment;
2. prerequisite repair;
3. insufficient independent evidence;
4. repeated difficulty or high assistance;
5. fluency development;
6. independent confirmation;
7. progression to the next unresolved component;
8. spaced review when a secure skill has become due;
9. checkpoint readiness;
10. no suitable unused content.

The current thresholds are explicit policy configuration, not universal educational truths: prerequisite floor `0.55`, secure probability `0.80`, at least two independent observations, two independent confirmations, a two-response difficulty window, high-assistance level four, and a fourteen-day review interval.

Content selection is deterministic. The planner filters to the target component and active mode, excludes already used items, then ranks activity type and difficulty for the selected need. It records a reason code, target component, content item, learner-facing explanation, policy version, and decision context.

## Worked trace

With prior `0.35`, a correct starting-check response gives an observation posterior of approximately `0.708`. No learning transition is applied in the assessment. A later independent correct practice response from `0.708` gives an observation posterior near `0.916`; the practice transition then raises the final state to approximately `0.929`.

If the learner asks for a hint before answering, that response is still stored with assistance metadata but does not update BKT. The planner can detect high help or repeated difficulty and select remediation. The companion itself never changes the state.

## Integrity and failure handling

- Evidence insertion, learner-state mutation, update-audit insertion, dispute completion, and session mutation run in one SQLite transaction.
- A failed model update rolls the whole interaction back.
- Content identifiers and prerequisite references are validated at startup.
- Single-choice content is checked for duplicate and mathematically equivalent answer options.
- Challenge tables have no path into learner-state or planner inputs; this boundary is tested.
- Learner and session APIs require a secret bearer token whose hash is stored in the database.

## Validation still required

Parameter calibration, threshold calibration, knowledge-component refinement, item-difficulty calibration, curriculum approval, fairness evaluation, and longitudinal learning-effect validation require real reviewed content and learner data. They are deliberately not disguised as solved problems.

The current candidate curriculum mapping was checked against official NCERT textbook listings, NCERT upper-primary learning outcomes, and CBSE competency-based Class 6 fractions material. Content remains reviewer-required until an educational reviewer approves the exact scope and item mapping.

Official references consulted:

- NCERT textbooks portal: <https://ncert.nic.in/textbook.php>
- NCERT Class VI mathematics learning outcomes: <https://ncert.nic.in/pdf/publication/otherpublications/tilops101.pdf>
- CBSE Class 6 curriculum-aligned mathematics items: <https://cbseacademic.nic.in/cbe/documents/SAS_Maths-Class-6.pdf>
- CBSE competency-based learning framework: <https://www.cbseacademic.nic.in/cbe/learning-framework.html>
