import { AlertTriangle, ArrowRight, BookOpenCheck, CheckCircle2, CircleDashed, Compass, RefreshCcw, Route, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { SkillState } from "../components/SkillState";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

export function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [recheck, setRecheck] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const learnerId = getStoredLearnerId();
  const load = () => learnerId && api.progress(learnerId).then(setData).catch((caught) => setError(caught.message));
  useEffect(() => { void load(); }, [learnerId]);
  if (!data && !error) return <AppShell><LoadingState label="Preparing your progress…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;

  const requestReassessment = async (skillId: string) => {
    if (!learnerId) return;
    try {
      const response = await api.disputeState(learnerId, skillId, "Learner requested a fresh skill check.");
      setNotice(response.message); setRecheck(null);
    } catch (caught: any) { setNotice(caught.message ?? "The request could not be saved. Please try again."); }
  };

  if (!data.goal) return <AppShell><div className="page progress-page"><header className="page-header page-header--compact"><div><span className="page-kicker">Progress</span><h1>Your learning, skill by skill</h1><p>Your progress will appear after you begin an available learning goal.</p></div></header><section className="empty-state empty-state--large"><CircleDashed size={24} /><h2>Start learning to see your progress</h2><p>Explore the learning areas available for your grade.</p><Link className="button button--primary" to="/learn">Explore learning areas <ArrowRight size={15} /></Link></section></div></AppShell>;

  return (
    <AppShell>
      <div className="page progress-page progress-page--complete">
        <header className="page-header page-header--compact"><div><span className="page-kicker">Progress</span><h1>See how your skills are growing</h1><p>Review what is going well, what needs practice, and what to learn next.</p></div></header>

        <section className="progress-goal-header"><div className="progress-goal-header__icon"><BookOpenCheck size={22} /></div><div><span>Current goal · {data.goal.subject}</span><h2>{data.goal.title}</h2><p>{data.goal.topic} · Grade {data.goal.grade}</p></div><Link className="button button--quiet" to={`/goals/${data.goal.id}`}>Open goal <ArrowRight size={15} /></Link></section>

        <div className="goal-state-summary" aria-label="Goal skill summary"><div><CheckCircle2 size={17} /><span>Confident</span><strong>{data.goalSummary.secureSkills}</strong></div><div><Compass size={17} /><span>Developing</span><strong>{data.goalSummary.developingSkills}</strong></div><div><AlertTriangle size={17} /><span>Needs practice</span><strong>{data.goalSummary.needsSupportSkills}</strong></div><div><CircleDashed size={17} /><span>Getting started</span><strong>{data.goalSummary.limitedEvidenceSkills}</strong></div></div>

        <section className="recommendation-panel"><div className="recommendation-panel__icon"><Route size={20} /></div><div className="recommendation-panel__copy"><span>Recommended next</span><h2>{data.recommendation.skill ?? "Build a strong starting point"}</h2><p>{data.recommendation.message}</p></div><div className="recommendation-panel__why"><strong>Why this next?</strong><p>We look at what you have practised, where you found difficulty, and which ideas connect next.</p></div></section>

        <div className="progress-layout">
          <section className="progress-skills-panel"><div className="dashboard-section__heading"><div><span>Your skills</span><h2>Skills in this goal</h2></div><small>{data.goalSummary.totalSkills} connected skills</small></div><div className="skill-list">{data.skills.length ? data.skills.map((skill: any) => <div key={skill.id} className="skill-with-action"><SkillState skill={skill} /><button className="text-button" onClick={() => setRecheck(skill.id)}>Ask for a fresh check</button>{recheck === skill.id && <div className="dispute-row"><p>We’ll add a new opportunity to check this skill while keeping your earlier practice history.</p><button className="button button--quiet" onClick={() => requestReassessment(skill.id)}>Request skill check</button><button className="text-button" onClick={() => setRecheck(null)}>Cancel</button></div>}</div>) : <div className="activity-empty"><CircleDashed size={18} /><span>Start this goal to see your skill progress.</span></div>}</div>{notice && <div className="success-notice">{notice}</div>}</section>

          <aside className="progress-aside"><section><div className="dashboard-section__heading"><div><span>Review</span><h2>Skills to revisit</h2></div><RefreshCcw size={17} /></div>{data.reviewNeeds.length ? <div className="review-list">{data.reviewNeeds.map((skill: any) => <div key={skill.id}><strong>{skill.title}</strong><span>{skill.status === "needs_support" ? "Needs practice" : "Developing"}</span></div>)}</div> : <p className="aside-empty">No review is needed right now. Keep learning to build a clearer picture.</p>}</section><section className="evidence-totals"><div className="dashboard-section__heading"><div><span>Practice</span><h2>Learning activity</h2></div></div><div><Sparkles size={16} /><span>Questions answered</span><strong>{data.evidenceSummary.totalInteractions}</strong></div><div><CheckCircle2 size={16} /><span>Answered independently</span><strong>{data.evidenceSummary.independentScorableResponses}</strong></div><div><Compass size={16} /><span>Completed with help</span><strong>{data.evidenceSummary.assistedResponses}</strong></div></section></aside>
        </div>

        <section className="progress-recent"><div className="dashboard-section__heading"><div><span>Recent learning</span><h2>Activity connected to this goal</h2></div></div><ActivityList activity={data.recentActivity} empty="Recent learning will appear after your first response." /></section>
        <div className="adaptation-note"><Sparkles size={18} /><div><strong>How your learning adapts</strong><p>Your answers and practice history help AI-Charya choose what you should practise next.</p></div></div>
      </div>
    </AppShell>
  );
}
