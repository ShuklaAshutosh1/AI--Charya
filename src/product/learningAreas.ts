import { getDomainsForGrade } from "../content/catalog.js";

export interface LearningArea {
  id: string;
  title: string;
  shortDescription: string;
  status: "available" | "coming_soon";
  populatedTopics: string[];
  roadmapTopics: string[];
  availabilityNote: string;
}

export const LEARNING_AREAS: LearningArea[] = [
  {
    id: "mathematics",
    title: "Mathematics",
    shortDescription: "Reason with numbers, patterns, quantities, and space.",
    status: "available",
    populatedTopics: ["Fractions"],
    roadmapTopics: ["Number play", "Patterns", "Fractions", "Geometry", "Perimeter and area", "Data and probability"],
    availabilityNote: "A complete adaptive Fractions pathway is available."
  },
  {
    id: "science",
    title: "Science",
    shortDescription: "Investigate the natural world through evidence and explanation.",
    status: "available",
    populatedTopics: ["Materials Around Us"],
    roadmapTopics: ["Scientific inquiry", "Living world", "Food and health", "Materials", "Separation", "Motion", "Light and space"],
    availabilityNote: "A complete adaptive Materials pathway is available."
  },
  {
    id: "english",
    title: "English",
    shortDescription: "Build reading, writing, vocabulary, and communication skills.",
    status: "available",
    populatedTopics: ["Reading for Meaning"],
    roadmapTopics: ["Reading for meaning", "Vocabulary in context", "Grammar in use", "Writing", "Speaking and listening"],
    availabilityNote: "A complete adaptive reading pathway is available."
  },
  {
    id: "social-science",
    title: "Social Science",
    shortDescription: "Understand people, places, institutions, and the past.",
    status: "available",
    populatedTopics: ["Locating Places on Earth"],
    roadmapTopics: ["Maps and places", "Landforms", "Timelines and sources", "India and its heritage", "Community", "Democracy", "Economic life"],
    availabilityNote: "A complete adaptive map-reading pathway is available."
  },
  {
    id: "computer-science",
    title: "Computer Science",
    shortDescription: "Develop computational thinking and digital fluency.",
    status: "available",
    populatedTopics: ["Algorithmic Thinking"],
    roadmapTopics: ["Digital citizenship", "Algorithms", "Data", "Networks", "Creative computing", "Problem solving"],
    availabilityNote: "A complete adaptive computational-thinking pathway is available."
  },
  {
    id: "hindi",
    title: "Hindi",
    shortDescription: "Strengthen language comprehension and expression.",
    status: "available",
    populatedTopics: ["पठन-बोध"],
    roadmapTopics: ["पठन-बोध", "शब्द और सन्दर्भ", "व्याकरण", "लेखन", "मौखिक अभिव्यक्ति"],
    availabilityNote: "A complete adaptive Hindi reading pathway is available."
  }
];

export function getLearningArea(id: string): LearningArea | undefined {
  return LEARNING_AREAS.find((area) => area.id === id);
}

export function getLearningAreasForGrade(grade?: number): LearningArea[] {
  const domains = getDomainsForGrade(grade);
  return LEARNING_AREAS.map((area) => {
    const topics = [...new Set(domains.filter((domain) => domain.goal.subject === area.title).map((domain) => domain.goal.topic))];
    return {...area, status:topics.length ? "available" : "coming_soon", populatedTopics:topics,
      roadmapTopics:topics,
      availabilityNote:topics.length ? `${topics.length} foundation path available.` : "Content for this grade is being prepared."};
  });
}
