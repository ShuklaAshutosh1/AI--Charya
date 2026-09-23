import type { ContentItem, KnowledgeComponent, LearningGoal } from "./types.js";

/**
 * A populated learning domain is the unit consumed by the adaptive engine.
 * It keeps curriculum content outside the planner and session orchestration.
 */
export interface LearningDomain {
  goal: LearningGoal;
  knowledgeComponents: KnowledgeComponent[];
  contentItems: ContentItem[];
}

export function validateLearningDomain(domain: LearningDomain): void {
  const componentIds = new Set(domain.knowledgeComponents.map((component) => component.id));
  if (componentIds.size !== domain.knowledgeComponents.length) {
    throw new Error(`Learning domain ${domain.goal.id} contains duplicate knowledge-component identifiers.`);
  }
  for (const componentId of domain.goal.knowledgeComponentIds) {
    if (!componentIds.has(componentId)) {
      throw new Error(`Learning goal ${domain.goal.id} references unknown component ${componentId}.`);
    }
  }
  const contentIds = new Set<string>();
  for (const item of domain.contentItems) {
    if (contentIds.has(item.id)) throw new Error(`Duplicate content item ${item.id}.`);
    contentIds.add(item.id);
    if (!componentIds.has(item.knowledgeComponentId)) {
      throw new Error(`Content item ${item.id} references unknown component ${item.knowledgeComponentId}.`);
    }
    if (item.modes.some((mode) => mode !== "learning") && !item.assessmentEligible) {
      throw new Error(`Assessment item ${item.id} must be explicitly assessment eligible.`);
    }
  }
}
