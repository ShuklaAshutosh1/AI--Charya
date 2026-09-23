import type { LearningDomain } from "../domain/learningDomain.js";
import { validateLearningDomain } from "../domain/learningDomain.js";
import {
  FRACTIONS_CONTENT,
  FRACTIONS_FOUNDATIONS_GOAL,
  FRACTIONS_KNOWLEDGE_COMPONENTS
} from "./fractions.js";
import { FOUNDATION_DOMAINS } from "./foundationDomains.js";
import { GRADE_LANGUAGE_MATH_PATHS } from "./gradePaths.js";
import { GRADE_WORLD_PATHS } from "./gradeWorldPaths.js";

export const LEARNING_DOMAINS: LearningDomain[] = [
  {
    goal: FRACTIONS_FOUNDATIONS_GOAL,
    knowledgeComponents: FRACTIONS_KNOWLEDGE_COMPONENTS,
    contentItems: FRACTIONS_CONTENT
  },
  ...FOUNDATION_DOMAINS,
  ...GRADE_LANGUAGE_MATH_PATHS,
  ...GRADE_WORLD_PATHS
];

for (const domain of LEARNING_DOMAINS) validateLearningDomain(domain);

export function getLearningDomain(goalId: string): LearningDomain {
  const domain = LEARNING_DOMAINS.find((entry) => entry.goal.id === goalId);
  if (!domain) throw new Error("Learning goal not found.");
  return domain;
}

export function getDomainsForGrade(grade?: number): LearningDomain[] {
  return grade === undefined
    ? LEARNING_DOMAINS
    : LEARNING_DOMAINS.filter((domain) => domain.goal.grade === grade);
}

export function getCatalogContentItem(id: string) {
  const item = LEARNING_DOMAINS.flatMap((domain) => domain.contentItems).find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown content item: ${id}`);
  return item;
}

export function getCatalogKnowledgeComponent(id: string) {
  const component = LEARNING_DOMAINS
    .flatMap((domain) => domain.knowledgeComponents)
    .find((entry) => entry.id === id);
  if (!component) throw new Error(`Unknown knowledge component: ${id}`);
  return component;
}

export function getDomainForContentItem(id: string): LearningDomain {
  const domain = LEARNING_DOMAINS.find((entry) => entry.contentItems.some((item) => item.id === id));
  if (!domain) throw new Error(`Unknown content item: ${id}`);
  return domain;
}
