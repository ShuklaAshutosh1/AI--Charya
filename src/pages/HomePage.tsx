import { ArrowRight, CalendarDays, Flame, MoveUpRight, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { AppShell } from "../components/AppShell";
import { LearningAreaIcon } from "../components/LearningAreaIcon";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const learnerId = getStoredLearnerId();
  const load = () => {
    if (!learnerId) return;
    setError("");
    api.home(learnerId).then(setData).catch((caught) => setError(caught.message));
  };
  useEffect(load, [learnerId]);

  if (!data && !error) return <AppShell><LoadingState /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;

  const rawFirstName = String(data.learner.name).split(" ")[0];
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const continueLabel = data.activeSession ? "Resume path" : data.goalStatus.status === "completed" ? "Revisit path" : "Begin path";
  const continueTarget = data.activeSession ? `/session/${data.activeSession.id}` : data.activeGoal ? `/goals/${data.activeGoal.id}` : "/learn";
  const goal = data.activeGoal;
  const nextSkill = data.recommendation.skill ?? "Choose a subject to begin";

  return (
    <AppShell>
      <div className="page home-v3">
        <header className="home-masthead">
          <div><span>{greeting()} / GRADE {data.learner.grade}</span><h1>{firstName}, your learning is ready to move.</h1></div>
          <div className="home-masthead__date"><CalendarDays size={15} /><span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</span></div>
        </header>

        <section className={`home-stage-v3 ${goal ? "home-stage-v3--active" : ""}`}>
          <div className="home-stage-v3__signal"><span>01</span><small>{goal ? "CURRENT DIRECTION" : "CHOOSE YOUR DIRECTION"}</small></div>
          <div className="home-stage-v3__main">
            <span className="home-stage-v3__subject">{goal ? `${goal.subject} / ${goal.topic}` : "SIX LEARNING AREAS / ONE PATH"}</span>
            <h2>{goal?.title ?? "Begin somewhere that makes you curious."}</h2>
            <p>{goal?.description ?? "Explore Mathematics, Science, English, Social Science, Computer Science, and Hindi. Your path will take shape from what you choose and how you learn."}</p>
            <button className="button button--signal" onClick={() => navigate(continueTarget)}>{continueLabel}<ArrowRight size={16} /></button>
          </div>
          <div className="home-stage-v3__map" aria-label={`Recommended next: ${nextSkill}`}>
            <div className="path-radar"><i /><i /><i /><span><Sparkles size={17} /></span></div>
            <small>NEXT SIGNAL</small><strong>{nextSkill}</strong>
            <p>{data.recommendation.message}</p>
          </div>
        </section>

        <section className="home-pulse" aria-label="Learning activity summary">
          <div><span><Zap size={15} /> LEARNING XP</span><strong>{data.engagement.xp}</strong><small>{data.engagement.nextMilestone.remainingXp} to the next marker</small></div>
          <div><span><Flame size={15} /> CURRENT RHYTHM</span><strong>{data.engagement.streakDays}<em> days</em></strong><small>{data.engagement.weeklyLearningDays} active days this week</small></div>
          <div><span><Target size={15} /> TODAY</span><strong>{data.todayGoal.questionsCompleted}<em> moves</em></strong><small>{data.todayGoal.completionPercent}% of today’s direction</small></div>
          <Link to="/leaderboard"><span><Trophy size={15} /> COMMUNITY</span><strong>View</strong><small>Open the learning leaderboard</small><MoveUpRight size={16} /></Link>
        </section>

        <section className="home-learning-index">
          <header><div><span>02 / YOUR LEARNING</span><h2>Six ways into the world.</h2></div><Link to="/learn">Open all learning areas <ArrowRight size={15} /></Link></header>
          <div className="home-subject-lines">
            {data.learningAreas.map((area: any, index: number) => (
              <button key={area.id} data-subject={area.id} onClick={() => navigate(`/learn/${area.id}`)}>
                <span className="home-subject-lines__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-subject-lines__icon"><LearningAreaIcon id={area.id} size={20} /></span>
                <strong>{area.title}</strong>
                <small>{area.populatedTopics.length ? area.populatedTopics.join(" · ") : "Pathways in preparation"}</small>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>

        <section className="home-closing-grid">
          <div className="home-recent-v3">
            <header><div><span>03 / RECENT MOVEMENT</span><h2>Where you’ve been.</h2></div><Link to="/progress">See progress <ArrowRight size={14} /></Link></header>
            <ActivityList activity={data.recentActivity} empty="Your learning history begins with your first calibration." />
          </div>
          <aside className="home-week-v3">
            <span>THIS WEEK</span><h2>{data.weeklyActivity.totalInteractions || "—"}</h2><p>{data.weeklyActivity.totalInteractions ? "learning interactions across your active paths" : "Your learning rhythm will appear here as you begin."}</p>
            <div className="home-week-v3__bars">{data.weeklyActivity.days.map((day: any) => <div key={day.date}><i style={{ height: `${Math.max(4, Math.min(100, day.interactions * 16))}%` }} /><span>{day.label}</span></div>)}</div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
