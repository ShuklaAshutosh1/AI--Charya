/**
 * Fictional practice-league profiles. They contain no real learner data and
 * are never read by evidence, mastery, assessment, or planner services.
 */
export const PRACTICE_LEADERBOARD = {
  label: "Leaderboard",
  period: "This week",
  privacyNote: "Leaderboard positions use fictional practice-league profiles and never expose another learner's private record.",
  entries: [
    { rank: 1, name: "Ashutosh S.", initials: "AS", xp: 760, streakDays: 8, accuracy: 91 },
    { rank: 2, name: "Tanix S.", initials: "TS", xp: 690, streakDays: 7, accuracy: 89 },
    { rank: 3, name: "Bhagat R.", initials: "BR", xp: 640, streakDays: 6, accuracy: 88, current: true },
    { rank: 4, name: "Ayush R.", initials: "AR", xp: 585, streakDays: 6, accuracy: 86 },
    { rank: 5, name: "Apple S.", initials: "AS", xp: 530, streakDays: 5, accuracy: 84 },
    { rank: 6, name: "Dev P.", initials: "DP", xp: 485, streakDays: 4, accuracy: 82 },
    { rank: 7, name: "Zaid S.", initials: "ZS", xp: 440, streakDays: 4, accuracy: 80 }
  ]
} as const;
