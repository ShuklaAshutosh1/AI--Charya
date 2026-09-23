import { api } from "./api";

export interface ChallengeTopic {
  id: string;
  subject: string;
  topic: string;
  title: string;
  grade: number;
}

export async function getChallengeTopic(learnerId: string): Promise<ChallengeTopic> {
  const learner = await api.learner(learnerId);
  const catalog = await api.catalog(learner.grade);
  const goal = catalog.goals.find((entry: ChallengeTopic) => entry.subject === "Mathematics");
  if (!goal) throw new Error(`A Mathematics challenge is not available for Grade ${learner.grade}.`);
  return goal;
}
