import type {
  ContentItem,
  ContentOption,
  ContentProvenance,
  HelpKind,
  KnowledgeComponent,
  LearningGoal
} from "../domain/types.js";

export const FRACTIONS_KNOWLEDGE_COMPONENTS: KnowledgeComponent[] = [
  {
    id: "fractions.meaning",
    title: "Interpret a fraction as equal parts of a whole",
    shortTitle: "Fraction meaning",
    objective: "Identify the numerator and denominator and connect a fraction to equal parts.",
    prerequisites: [],
    order: 1
  },
  {
    id: "fractions.equivalent",
    title: "Recognise and generate equivalent fractions",
    shortTitle: "Equivalent fractions",
    objective: "Use multiplication, division, and simplification to identify equivalent fractions.",
    prerequisites: ["fractions.meaning"],
    order: 2
  },
  {
    id: "fractions.compare",
    title: "Compare and order fractions",
    shortTitle: "Compare fractions",
    objective: "Compare fractions using common denominators or equivalent representations.",
    prerequisites: ["fractions.meaning", "fractions.equivalent"],
    order: 3
  },
  {
    id: "fractions.add_like",
    title: "Add and subtract fractions with like denominators",
    shortTitle: "Like-denominator operations",
    objective: "Add or subtract numerators while preserving the shared unit represented by the denominator.",
    prerequisites: ["fractions.meaning", "fractions.equivalent"],
    order: 4
  }
];

export const FRACTIONS_FOUNDATIONS_GOAL: LearningGoal = {
  id: "math-g6-fractions-foundations",
  title: "Fractions foundations",
  description: "Build a connected understanding of fraction meaning, equivalence, comparison, and like-denominator operations.",
  subject: "Mathematics",
  topic: "Fractions",
  grade: 6,
  context: "independent",
  knowledgeComponentIds: FRACTIONS_KNOWLEDGE_COMPONENTS.map((component) => component.id),
  curriculumStatus: "candidate_mapping",
  curriculumNote:
    "Candidate alignment to relevant Indian middle-school fractions learning. Exact NCERT/CBSE mapping requires content-review approval before an authoritative claim is made.",
  contentVersion: "fractions-foundations-v0.1-review-required"
};

const PROVENANCE: ContentProvenance = {
  authoringSource: "AI-Charya authored seed content",
  curriculumReference: "India middle-school fractions candidate alignment; exact NCERT/CBSE mapping pending review",
  reviewStatus: "review_required",
  version: "2026-08-seed-v1"
};

const options = (...values: string[]): ContentOption[] =>
  values.map((text, index) => ({ id: String.fromCharCode(65 + index), text }));

function help(
  knownInformation: string,
  conceptualHint: string,
  methodStep: string,
  analogousExample: string,
  guidedSteps: string,
  completeSolution: string
): Record<HelpKind, string> {
  return {
    clarify: "Read the quantities carefully. You are choosing one answer from the four options.",
    known_information: knownInformation,
    conceptual_hint: conceptualHint,
    method_step: methodStep,
    analogous_example: analogousExample,
    guided_steps: guidedSteps,
    complete_solution: completeSolution
  };
}

const item = (content: Omit<ContentItem, "type" | "provenance">): ContentItem => ({
  ...content,
  type: "single_choice",
  provenance: PROVENANCE
});

export const FRACTIONS_CONTENT: ContentItem[] = [
  item({
    id: "diag-meaning-01",
    knowledgeComponentId: "fractions.meaning",
    modes: ["diagnostic"],
    activityType: "diagnostic_question",
    difficulty: "foundational",
    prompt: "A ribbon is divided into 8 equal parts. Three parts are coloured. What fraction of the ribbon is coloured?",
    options: options("3/8", "5/8", "3/5", "8/3"),
    correctOptionId: "A",
    explanation: "The denominator counts all 8 equal parts, and the numerator counts the 3 coloured parts, so the fraction is 3/8.",
    help: help(
      "The ribbon has 8 equal parts in total and 3 coloured parts.",
      "The denominator counts all equal parts; the numerator counts the selected parts.",
      "Place the number of coloured parts above the number of total equal parts.",
      "If 2 of 7 equal parts are coloured, the fraction is 2/7.",
      "Count coloured parts: 3. Count total parts: 8. Write coloured over total.",
      "There are 3 coloured parts out of 8 equal parts, so the answer is 3/8."
    ),
    assessmentEligible: true
  }),
  item({
    id: "diag-equivalent-01",
    knowledgeComponentId: "fractions.equivalent",
    modes: ["diagnostic"],
    activityType: "diagnostic_question",
    difficulty: "standard",
    prompt: "Which fraction is equivalent to 3/5?",
    options: options("6/10", "6/8", "9/20", "4/7"),
    correctOptionId: "A",
    explanation: "Multiplying both 3 and 5 by 2 gives 6/10, so the fractions name the same quantity.",
    help: help(
      "Equivalent fractions have the same value even when their numerators and denominators differ.",
      "Try multiplying the numerator and denominator by the same number.",
      "Multiply both 3 and 5 by 2.",
      "2/3 is equivalent to 4/6 because both numbers were multiplied by 2.",
      "Start with 3/5. Multiply 3 by 2 and 5 by 2, then find that option.",
      "3 × 2 = 6 and 5 × 2 = 10, so the answer is 6/10."
    ),
    assessmentEligible: true
  }),
  item({
    id: "diag-compare-01",
    knowledgeComponentId: "fractions.compare",
    modes: ["diagnostic"],
    activityType: "diagnostic_question",
    difficulty: "standard",
    prompt: "Which is greater: 5/8 or 3/4?",
    options: options("5/8", "3/4", "They are equal", "There is not enough information"),
    correctOptionId: "B",
    explanation: "3/4 is 6/8. Since 6/8 is greater than 5/8, 3/4 is greater.",
    help: help(
      "You can compare the fractions after expressing them with the same denominator.",
      "Rewrite 3/4 in eighths.",
      "Multiply the numerator and denominator of 3/4 by 2.",
      "To compare 1/2 and 3/8, rewrite 1/2 as 4/8.",
      "Keep 5/8. Convert 3/4 to eighths, then compare the numerators.",
      "3/4 = 6/8, and 6/8 > 5/8, so 3/4 is greater."
    ),
    assessmentEligible: true
  }),
  item({
    id: "diag-add-01",
    knowledgeComponentId: "fractions.add_like",
    modes: ["diagnostic"],
    activityType: "diagnostic_question",
    difficulty: "standard",
    prompt: "What is 3/11 + 5/11?",
    options: options("8/11", "8/22", "2/11", "15/11"),
    correctOptionId: "A",
    explanation: "The parts are already the same size, so add 3 + 5 and keep the denominator 11. The result is 8/11.",
    help: help(
      "Both fractions have denominator 11, so they count the same-sized parts.",
      "When denominators match, combine the numerators and keep the denominator.",
      "Add 3 and 5; leave 11 unchanged.",
      "2/9 + 4/9 = 6/9 because the pieces are all ninths.",
      "Check the denominators, add the numerators, and retain the shared denominator.",
      "3 + 5 = 8, and the denominator remains 11, so the answer is 8/11."
    ),
    assessmentEligible: true
  }),

  item({
    id: "learn-meaning-01",
    knowledgeComponentId: "fractions.meaning",
    modes: ["learning"],
    activityType: "guided_practice",
    difficulty: "foundational",
    instruction: "A fraction describes equal parts. The numerator counts the selected parts; the denominator names how many equal parts make the whole.",
    prompt: "A set contains 10 equal tiles. Seven are blue. What fraction of the set is blue?",
    options: options("7/10", "3/10", "7/3", "10/7"),
    correctOptionId: "A",
    explanation: "Seven selected tiles out of ten equal tiles is 7/10.",
    help: help(
      "There are 7 blue tiles and 10 tiles altogether.",
      "Selected parts go above total equal parts.",
      "Write 7 over 10.",
      "Four red counters out of nine counters is 4/9.",
      "Count blue tiles, count all tiles, and write blue over all.",
      "There are 7 blue tiles out of 10, so the answer is 7/10."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-meaning-02",
    knowledgeComponentId: "fractions.meaning",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "In the fraction 4/9, what does the denominator 9 represent?",
    options: options("The total number of equal parts", "The number of selected parts", "The number of unselected parts", "The size of the numerator"),
    correctOptionId: "A",
    explanation: "The denominator tells us that the whole has been divided into 9 equal parts.",
    help: help(
      "The denominator is the number below the fraction bar.",
      "Think about what the bottom number says about the whole.",
      "Ask: into how many equal parts was the whole divided?",
      "In 2/7, the 7 says the whole is divided into 7 equal parts.",
      "Locate the denominator, recall its role, and match that role to an option.",
      "The denominator 9 represents the total number of equal parts."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-meaning-03",
    knowledgeComponentId: "fractions.meaning",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "Five equal pieces are taken from a strip divided into 12 equal pieces. Which fraction represents the pieces taken?",
    options: options("5/12", "7/12", "12/5", "5/7"),
    correctOptionId: "A",
    explanation: "The 5 taken pieces form the numerator and all 12 equal pieces form the denominator: 5/12.",
    help: help(
      "Five pieces are selected from twelve equal pieces in all.",
      "Put the selected amount over the total amount.",
      "Use 5 as the numerator and 12 as the denominator.",
      "Three selected pieces out of ten is 3/10.",
      "Identify selected = 5 and total = 12, then form the fraction.",
      "Selected over total is 5/12."
    ),
    assessmentEligible: false
  }),

  item({
    id: "learn-equivalent-01",
    knowledgeComponentId: "fractions.equivalent",
    modes: ["learning"],
    activityType: "guided_practice",
    difficulty: "foundational",
    instruction: "Equivalent fractions describe the same amount. Dividing a numerator and denominator by their common factor produces a simpler equivalent fraction.",
    prompt: "Simplify 8/12 to its lowest terms.",
    options: options("2/3", "3/5", "5/8", "2/5"),
    correctOptionId: "A",
    explanation: "The greatest common factor of 8 and 12 is 4. Dividing both by 4 gives 2/3.",
    help: help(
      "Eight and twelve share a common factor greater than one.",
      "Find the greatest number that divides both 8 and 12.",
      "Divide both numbers by 4.",
      "6/9 simplifies to 2/3 when both numbers are divided by 3.",
      "Find the common factor 4, calculate 8 ÷ 4 and 12 ÷ 4, then form the fraction.",
      "8 ÷ 4 = 2 and 12 ÷ 4 = 3, so 8/12 simplifies to 2/3."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-equivalent-02",
    knowledgeComponentId: "fractions.equivalent",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "Complete the equivalent fraction: 2/5 = ?/15",
    options: options("4", "5", "6", "10"),
    correctOptionId: "C",
    explanation: "The denominator was multiplied by 3, so multiply the numerator by 3 as well: 2 × 3 = 6.",
    help: help(
      "The denominator changes from 5 to 15.",
      "Find the multiplication factor from 5 to 15 and apply it to 2.",
      "Since 5 × 3 = 15, calculate 2 × 3.",
      "For 3/4 = ?/8, multiply both 3 and 4 by 2 to get 6/8.",
      "Calculate 15 ÷ 5, then multiply 2 by that same result.",
      "15 ÷ 5 = 3 and 2 × 3 = 6, so the missing numerator is 6."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-equivalent-03",
    knowledgeComponentId: "fractions.equivalent",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "Which fraction is equivalent to 7/9?",
    options: options("14/18", "21/18", "14/16", "9/7"),
    correctOptionId: "A",
    explanation: "Multiplying both 7 and 9 by 2 gives 14/18.",
    help: help(
      "Use the same multiplier for both parts of the fraction.",
      "Try doubling both the numerator and denominator.",
      "Calculate 7 × 2 and 9 × 2.",
      "5/6 becomes 10/12 when both numbers are doubled.",
      "Double 7, double 9, and find the resulting fraction.",
      "7 × 2 = 14 and 9 × 2 = 18, so the answer is 14/18."
    ),
    assessmentEligible: false
  }),

  item({
    id: "learn-compare-01",
    knowledgeComponentId: "fractions.compare",
    modes: ["learning"],
    activityType: "guided_practice",
    difficulty: "standard",
    instruction: "To compare fractions with different denominators, rewrite them using a common denominator and compare the numerators.",
    prompt: "Which is greater: 5/6 or 7/9?",
    options: options("5/6", "7/9", "They are equal", "They cannot be compared"),
    correctOptionId: "A",
    explanation: "Using denominator 18, 5/6 = 15/18 and 7/9 = 14/18. Therefore 5/6 is greater.",
    help: help(
      "Both fractions can be expressed in eighteenths.",
      "Convert each fraction to denominator 18.",
      "Multiply 5/6 by 3/3 and 7/9 by 2/2.",
      "For 2/3 and 3/5, use fifteenths: 10/15 and 9/15.",
      "Convert to 15/18 and 14/18, then compare their numerators.",
      "5/6 = 15/18 and 7/9 = 14/18, so 5/6 is greater."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-compare-02",
    knowledgeComponentId: "fractions.compare",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "Which is the smallest fraction?",
    options: options("3/4", "2/3", "5/6", "7/8"),
    correctOptionId: "B",
    explanation: "Using denominator 24 gives 18/24, 16/24, 20/24, and 21/24. The smallest is 16/24, which is 2/3.",
    help: help(
      "A common denominator lets you compare all four fractions directly.",
      "Use 24 as a common denominator.",
      "Rewrite each fraction in twenty-fourths, then choose the smallest numerator.",
      "When comparing 1/2, 2/3, and 3/4, twelfths give 6/12, 8/12, and 9/12.",
      "Convert all four fractions to denominator 24 and compare 18, 16, 20, and 21.",
      "2/3 = 16/24, the smallest converted numerator, so 2/3 is the answer."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-compare-03",
    knowledgeComponentId: "fractions.compare",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "stretch",
    prompt: "Which is greater: 4/7 or 5/8?",
    options: options("4/7", "5/8", "They are equal", "Their order depends on the whole"),
    correctOptionId: "B",
    explanation: "With denominator 56, 4/7 = 32/56 and 5/8 = 35/56. Therefore 5/8 is greater.",
    help: help(
      "The least common denominator is 56.",
      "Rewrite both fractions as fifty-sixths.",
      "Multiply 4/7 by 8/8 and 5/8 by 7/7.",
      "To compare 3/5 and 4/7, rewrite them as 21/35 and 20/35.",
      "Calculate 4 × 8 and 5 × 7, then compare the new numerators.",
      "4/7 = 32/56 and 5/8 = 35/56, so 5/8 is greater."
    ),
    assessmentEligible: false
  }),

  item({
    id: "learn-add-01",
    knowledgeComponentId: "fractions.add_like",
    modes: ["learning"],
    activityType: "guided_practice",
    difficulty: "foundational",
    instruction: "With like denominators, the pieces are the same size. Combine the number of pieces and keep the denominator that names their size.",
    prompt: "What is 3/10 + 4/10?",
    options: options("7/10", "7/20", "1/10", "12/10"),
    correctOptionId: "A",
    explanation: "Add the numerators 3 + 4 and keep the denominator 10, giving 7/10.",
    help: help(
      "Both fractions count tenths.",
      "Combine the number of tenths without changing their size.",
      "Add 3 and 4; retain denominator 10.",
      "1/8 + 3/8 = 4/8 because both quantities count eighths.",
      "Check that denominators match, add the numerators, and keep the shared denominator.",
      "3 + 4 = 7, so the answer is 7/10."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-add-02",
    knowledgeComponentId: "fractions.add_like",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    prompt: "What is 11/12 − 5/12 in simplest form?",
    options: options("1/2", "5/12", "7/12", "6/7"),
    correctOptionId: "A",
    explanation: "Subtract 5 from 11 to get 6/12, then simplify 6/12 to 1/2.",
    help: help(
      "The denominators match, and the result can be simplified.",
      "Subtract the numerators first, then look for a common factor.",
      "Calculate 11 − 5 over 12, then divide numerator and denominator by 6.",
      "9/10 − 4/10 = 5/10, which simplifies to 1/2.",
      "Form 6/12, find the greatest common factor 6, and simplify.",
      "11/12 − 5/12 = 6/12 = 1/2."
    ),
    assessmentEligible: false
  }),
  item({
    id: "learn-add-03",
    knowledgeComponentId: "fractions.add_like",
    modes: ["learning"],
    activityType: "independent_practice",
    difficulty: "standard",
    context: "Meera walks 2/9 km to a library and then 3/9 km to a park.",
    prompt: "How far does Meera walk altogether?",
    options: options("5/9 km", "5/18 km", "1/9 km", "6/9 km"),
    correctOptionId: "A",
    explanation: "Both distances are in ninths, so 2/9 + 3/9 = 5/9 km.",
    help: help(
      "The two distances use the same unit and the same denominator.",
      "Add the two numbers of ninths.",
      "Compute 2 + 3 and keep denominator 9.",
      "Walking 1/7 km and then 4/7 km totals 5/7 km.",
      "Write 2/9 + 3/9, add the numerators, and attach the kilometre unit.",
      "2/9 + 3/9 = 5/9, so Meera walks 5/9 km."
    ),
    assessmentEligible: false
  }),

  item({
    id: "check-meaning-01",
    knowledgeComponentId: "fractions.meaning",
    modes: ["checkpoint"],
    activityType: "checkpoint_question",
    difficulty: "standard",
    prompt: "In the fraction 7/12, what does 12 tell us?",
    options: options("The whole is divided into 12 equal parts", "Seven parts are unselected", "The fraction is greater than one", "Twelve parts are selected"),
    correctOptionId: "A",
    explanation: "The denominator 12 says the whole is divided into 12 equal parts.",
    help: help(
      "Focus on the role of the number below the fraction bar.",
      "The denominator describes the equal partition of the whole.",
      "Ask how many equal parts make the whole.",
      "In 3/8, the 8 means eight equal parts form the whole.",
      "Identify 12 as the denominator and recall what a denominator represents.",
      "The 12 means the whole has 12 equal parts."
    ),
    assessmentEligible: true
  }),
  item({
    id: "check-equivalent-01",
    knowledgeComponentId: "fractions.equivalent",
    modes: ["checkpoint"],
    activityType: "checkpoint_question",
    difficulty: "standard",
    prompt: "Simplify 15/25 to its lowest terms.",
    options: options("3/5", "2/5", "5/3", "4/5"),
    correctOptionId: "A",
    explanation: "Divide numerator and denominator by their greatest common factor, 5: 15/25 = 3/5.",
    help: help(
      "Look for a common factor of 15 and 25.",
      "Both values are divisible by 5.",
      "Divide the numerator and denominator by 5.",
      "10/15 simplifies to 2/3 when both values are divided by 5.",
      "Calculate 15 ÷ 5 and 25 ÷ 5, then form the fraction.",
      "15/25 = 3/5."
    ),
    assessmentEligible: true
  }),
  item({
    id: "check-compare-01",
    knowledgeComponentId: "fractions.compare",
    modes: ["checkpoint"],
    activityType: "checkpoint_question",
    difficulty: "standard",
    prompt: "Which is greater: 7/12 or 5/8?",
    options: options("7/12", "5/8", "They are equal", "They cannot be compared"),
    correctOptionId: "B",
    explanation: "Using denominator 24, 7/12 = 14/24 and 5/8 = 15/24. Therefore 5/8 is greater.",
    help: help(
      "A common denominator can make the comparison direct.",
      "Both fractions can be rewritten as twenty-fourths.",
      "Double 7/12 and triple 5/8.",
      "For 1/3 and 3/8, rewrite them as 8/24 and 9/24.",
      "Convert to 14/24 and 15/24, then compare.",
      "5/8 = 15/24, which is greater than 14/24, so 5/8 is greater."
    ),
    assessmentEligible: true
  }),
  item({
    id: "check-add-01",
    knowledgeComponentId: "fractions.add_like",
    modes: ["checkpoint"],
    activityType: "checkpoint_question",
    difficulty: "standard",
    prompt: "What is 7/15 − 2/15 in simplest form?",
    options: options("1/3", "2/3", "5/13", "9/15"),
    correctOptionId: "A",
    explanation: "Subtracting gives 5/15, and dividing numerator and denominator by 5 gives 1/3.",
    help: help(
      "The fractions count equal-sized fifteenths.",
      "Subtract the numerators, then simplify the result.",
      "Calculate 7 − 2 over 15 and divide both parts by 5.",
      "8/12 − 2/12 = 6/12 = 1/2.",
      "Form 5/15, identify common factor 5, and simplify.",
      "7/15 − 2/15 = 5/15 = 1/3."
    ),
    assessmentEligible: true
  })
];

// Reserve practice is authored from deterministic arithmetic templates. Each item
// has a stable identifier and distinct quantities; answers are derived, not guessed.
// These are practice items only and never replace held-out assessment items.
for (let variant = 1; variant <= 12; variant += 1) {
  const denominator = variant + 8;
  const numerator = variant % 5 + 2;
  const factor = variant % 3 + 2;
  const offset = variant % 4;
  const makeReserve = (skill: string, prompt: string, choices: string[], explanation: string, hint: string, example: string) => {
    const rotated = choices.map((_, position) => choices[(position + offset) % choices.length]);
    FRACTIONS_CONTENT.push(item({
      id: `reserve-${skill}-${String(variant).padStart(2, "0")}`,
      knowledgeComponentId: `fractions.${skill}`,
      modes: ["learning"],
      activityType: variant % 3 === 0 ? "remediation" : "independent_practice",
      difficulty: variant % 3 === 0 ? "foundational" : "standard",
      prompt,
      options: options(...rotated),
      correctOptionId: String.fromCharCode(65 + (4 - offset) % 4),
      explanation,
      help: help(hint, hint, hint, example, `${hint} Compare your result with the four choices.`, explanation),
      assessmentEligible: false
    }));
  };
  makeReserve("meaning",
    `A mosaic has ${denominator} equal-sized tiles. ${numerator} tiles are blue. What fraction of its tiles are blue?`,
    [numerator, numerator + 1, numerator + 2, numerator - 1].map((n) => `${n}/${denominator}`),
    `${numerator} of the ${denominator} equal-sized tiles are blue, so the fraction is ${numerator}/${denominator}.`,
    "Use the selected parts as the numerator and all equal parts as the denominator.",
    "If 2 of 7 equal panels are painted, the painted fraction is 2/7.");
  makeReserve("equivalent",
    `Which fraction has the same value as ${numerator}/${denominator}?`,
    [numerator * factor, numerator * factor + 1, numerator * factor + 2, numerator * factor - 1].map((n) => `${n}/${denominator * factor}`),
    `Multiply numerator and denominator by ${factor}: ${numerator}/${denominator} = ${numerator * factor}/${denominator * factor}.`,
    "Equivalent fractions multiply or divide both parts by the same non-zero number.",
    "3/7 and 6/14 are equivalent because both parts are multiplied by 2.");
  makeReserve("compare",
    `Which is greater: ${numerator}/${denominator} or ${numerator + 1}/${denominator + 1}?`,
    [`${numerator + 1}/${denominator + 1}`, `${numerator}/${denominator}`, "They are equal", "There is not enough information"],
    `With denominator ${denominator * (denominator + 1)}, the numerators are ${numerator * (denominator + 1)} and ${(numerator + 1) * denominator}. The second is larger, so ${numerator + 1}/${denominator + 1} is greater.`,
    "Express both fractions with a common denominator and compare the numerators.",
    "To compare 2/5 and 3/7, rewrite them as 14/35 and 15/35. Thus 3/7 is larger.");
  makeReserve("add_like",
    `What is ${numerator}/${denominator} + 2/${denominator}?`,
    [numerator + 2, numerator + 1, numerator + 3, numerator - 1].map((n) => `${n}/${denominator}`),
    `Both fractions count ${denominator}ths. Add the numerators and keep the denominator: ${numerator} + 2 = ${numerator + 2}, giving ${numerator + 2}/${denominator}.`,
    "When the denominators match, add the numerators while keeping the shared denominator.",
    "2/9 + 3/9 = 5/9 because both quantities count ninths.");
}

export function getKnowledgeComponent(id: string): KnowledgeComponent {
  const component = FRACTIONS_KNOWLEDGE_COMPONENTS.find((entry) => entry.id === id);
  if (!component) throw new Error(`Unknown knowledge component: ${id}`);
  return component;
}

export function getContentItem(id: string): ContentItem {
  const contentItem = FRACTIONS_CONTENT.find((entry) => entry.id === id);
  if (!contentItem) throw new Error(`Unknown content item: ${id}`);
  return contentItem;
}
