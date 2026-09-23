import { getStoredAccessToken } from "./session";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getStoredAccessToken();
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers
    }
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new ApiError(data.error ?? "The request could not be completed.");
  return data;
}

export const api = {
  catalog: (grade?: number) => request<any>(`/catalog${grade ? `?grade=${grade}` : ""}`),
  createLearner: (payload: { name: string; grade: number }) =>
    request<any>("/learners", { method: "POST", body: JSON.stringify(payload) }),
  learner: (learnerId: string) => request<any>(`/learners/${learnerId}`),
  home: (learnerId: string) => request<any>(`/learners/${learnerId}/home`),
  progress: (learnerId: string) => request<any>(`/learners/${learnerId}/progress`),
  profileOverview: (learnerId: string) =>
    request<any>(`/learners/${learnerId}/profile-overview`),
  preferences: (learnerId: string) => request<any>(`/learners/${learnerId}/preferences`),
  updatePreferences: (learnerId: string, payload: Record<string, unknown>) =>
    request<any>(`/learners/${learnerId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  leaderboard: () => request<any>("/engagement/leaderboard"),
  startGoal: (goalId: string, learnerId: string, entryMode: "learn" | "check" = "check") =>
    request<any>(`/goals/${goalId}/start`, {
      method: "POST",
      body: JSON.stringify({ learnerId, entryMode })
    }),
  session: (sessionId: string) => request<any>(`/sessions/${sessionId}`),
  respond: (
    sessionId: string,
    payload: { selectedOptionId?: string; skipped?: boolean; responseTimeMs?: number }
  ) =>
    request<any>(`/sessions/${sessionId}/respond`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  next: (sessionId: string) =>
    request<any>(`/sessions/${sessionId}/next`, { method: "POST", body: "{}" }),
  startCheckpoint: (sessionId: string) =>
    request<any>(`/sessions/${sessionId}/checkpoint`, { method: "POST", body: "{}" }),
  assistance: (sessionId: string, kind: string) =>
    request<any>(`/sessions/${sessionId}/assistance`, {
      method: "POST",
      body: JSON.stringify({ kind })
    }),
  disputeState: (learnerId: string, knowledgeComponentId: string, note: string) =>
    request<any>(`/learners/${learnerId}/state-disputes`, {
      method: "POST",
      body: JSON.stringify({ knowledgeComponentId, note })
    }),
  startChallenge: (payload: { learnerId: string; goalId: string; mode: "one_v_one" | "rapid_fire" }) =>
    request<any>("/challenges", { method: "POST", body: JSON.stringify(payload) }),
  challenge: (matchId: string, learnerId: string) =>
    request<any>(`/challenges/${matchId}?learnerId=${encodeURIComponent(learnerId)}`),
  respondToChallenge: (
    matchId: string,
    payload: { learnerId: string; selectedOptionId?: string; responseTimeMs?: number }
  ) => request<any>(`/challenges/${matchId}/respond`, { method: "POST", body: JSON.stringify(payload) }),
  nextChallengeQuestion: (matchId: string, learnerId: string) =>
    request<any>(`/challenges/${matchId}/next`, {
      method: "POST",
      body: JSON.stringify({ learnerId })
    })
};
