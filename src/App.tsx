import { Navigate, Route, Routes } from "react-router-dom";
import { getStoredLearnerId } from "./lib/session";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { GoalPage } from "./pages/GoalPage";
import { SessionPage } from "./pages/SessionPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SubjectPage } from "./pages/SubjectPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ChallengePage } from "./pages/ChallengePage";
import { OneVsOneChallengePage } from "./pages/OneVsOneChallengePage";
import { RapidFireChallengePage } from "./pages/RapidFireChallengePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/learn/:subjectId" element={<SubjectPage />} />
      <Route path="/challenge" element={<ChallengePage />} />
      <Route path="/challenge/1v1" element={<OneVsOneChallengePage />} />
      <Route path="/challenge/rapid-fire" element={<RapidFireChallengePage />} />
      <Route path="/goals/:goalId" element={<GoalPage />} />
      <Route path="/session/:sessionId" element={<SessionPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to={getStoredLearnerId() ? "/home" : "/"} replace />} />
    </Routes>
  );
}
