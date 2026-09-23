const LEARNER_KEY = "ai-charya.learner-id";
const ACCESS_TOKEN_KEY = "ai-charya.access-token";

export function getStoredLearnerId(): string | null {
  const learnerId = window.localStorage.getItem(LEARNER_KEY);
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return learnerId && token ? learnerId : null;
}

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeLearnerSession(learnerId: string, accessToken: string): void {
  window.localStorage.setItem(LEARNER_KEY, learnerId);
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearLearnerId(): void {
  window.localStorage.removeItem(LEARNER_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
