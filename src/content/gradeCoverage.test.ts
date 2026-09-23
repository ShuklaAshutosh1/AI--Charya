import { describe, expect, it } from "vitest";
import { LEARNING_DOMAINS, getDomainsForGrade } from "./catalog";

const subjects = ["Mathematics", "Science", "English", "Social Science", "Computer Science", "Hindi"];

describe("Grades 1–8 foundation coverage", () => {
  for (let grade = 1; grade <= 8; grade += 1) {
    it(`provides one working entry path per subject in Grade ${grade}`, () => {
      const domains = getDomainsForGrade(grade);
      expect(domains).toHaveLength(subjects.length);
      expect(domains.map((domain) => domain.goal.subject).sort()).toEqual([...subjects].sort());
      const mathematics = domains.find((domain) => domain.goal.subject === "Mathematics");
      expect(mathematics?.contentItems.filter((item) => item.modes.includes("learning")).length).toBeGreaterThanOrEqual(10);
    });
  }

  it("keeps identifiers unique and every component teachable and assessable", () => {
    const goalIds = LEARNING_DOMAINS.map((domain) => domain.goal.id);
    const componentIds = LEARNING_DOMAINS.flatMap((domain) => domain.knowledgeComponents.map((component) => component.id));
    const itemIds = LEARNING_DOMAINS.flatMap((domain) => domain.contentItems.map((item) => item.id));
    expect(new Set(goalIds).size).toBe(goalIds.length);
    expect(new Set(componentIds).size).toBe(componentIds.length);
    expect(new Set(itemIds).size).toBe(itemIds.length);

    for (const domain of LEARNING_DOMAINS) {
      for (const component of domain.knowledgeComponents) {
        const items = domain.contentItems.filter((item) => item.knowledgeComponentId === component.id);
        expect(items.some((item) => item.modes.includes("diagnostic")), component.id).toBe(true);
        expect(items.some((item) => item.modes.includes("learning")), component.id).toBe(true);
        expect(items.some((item) => item.modes.includes("checkpoint")), component.id).toBe(true);
      }
      for (const item of domain.contentItems) {
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options.map((option) => option.text)).size, item.id).toBe(4);
        expect(item.options.some((option) => option.id === item.correctOptionId), item.id).toBe(true);
      }
    }
  });
});
