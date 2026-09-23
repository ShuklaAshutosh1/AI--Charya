<p align="center">
  <img src="ai-charya-banner.png" alt="AI-Charya - Adaptive Learning Platform" width="100%">
</p>


# AI-Charya 🎓🤖

> **An adaptive learning platform that personalizes education using learner-state estimation, diagnostic assessment, and explainable activity planning.**

AI-Charya is a learner-first adaptive learning platform designed for students in **Grades 1–8**. It combines diagnostic assessment, learner modeling, adaptive planning, progress tracking, and contextual assistance to create a personalized learning experience.

The current implementation provides foundation learning paths across **Mathematics, Science, English, Social Science, Computer Science, and Hindi**, with Grade 6 Fractions serving as the deepest populated learning domain.

---

## 🚀 Key Features

- 🧠 **Adaptive Learning** — Estimates learner skill levels and selects suitable next activities.
- 📊 **Diagnostic Assessment** — Uses initial evidence to establish learner knowledge states.
- 🎯 **Personalized Learning Paths** — Provides grade- and subject-aware learning goals.
- 🔄 **Learner Model** — Implements a versioned provisional Bayesian Knowledge Tracing (BKT) model.
- 🧭 **Explainable Planner** — Separates learner-state estimation from activity selection and records planning decisions.
- 💬 **Contextual Assistance** — Provides structured, reviewed support without directly modifying learner mastery.
- 📝 **Checkpoint Assessments** — Uses independent evidence to evaluate learning progress.
- 📈 **Progress Tracking** — Tracks skill states, evidence, XP, accuracy, streaks, and achievements.
- 🏆 **Challenges & Leaderboard** — Includes deterministic 1v1 and Rapid Fire practice.
- 🔐 **Protected APIs** — Learner, session, preference, and challenge APIs use access-token protection.
- 💾 **Persistent Storage** — Uses SQLite for learner and learning-session data.

---

```text
## 🧠 How the Adaptive Learning Loop Works

```text
Learner Profile
      ↓
Goal Selection
      ↓
Diagnostic Assessment
      ↓
Learner State Estimation
      ↓
Adaptive Activity Planner
      ↓
Learning Activity
      ↓
Independent Evidence
      ↓
Learner Model Update
      ↓
Checkpoint Assessment
      ↓
Progress & Next Recommendation