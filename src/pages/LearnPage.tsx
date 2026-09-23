import { ArrowRight, MoveUpRight, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { LearningAreaIcon } from "../components/LearningAreaIcon";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

export function LearnPage() {
  const [learner, setLearner] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [home, setHome] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const learnerId = getStoredLearnerId();

  const load = async () => {
    if (!learnerId) return;
    setError("");
    try {
      const current = await api.learner(learnerId);
      const [nextCatalog, nextHome] = await Promise.all([api.catalog(current.grade), api.home(learnerId)]);
      setLearner(current);
      setCatalog(nextCatalog);
      setHome(nextHome);
    } catch (caught: any) { setError(caught.message); }
  };
  useEffect(() => { void load(); }, [learnerId]);

  if (!catalog && !error) return <AppShell><LoadingState label="Opening your learning map…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;

  const goalTarget = home?.activeSession
    ? `/session/${home.activeSession.id}`
    : home?.activeGoal
      ? `/goals/${home.activeGoal.id}`
      : "/learn";

  return (
    <AppShell>
      <div className="page learn-v3">
        <header className="learn-v3__header">
          <span>LEARNING MAP / GRADE {learner.grade}</span>
          <h1>What do you want to understand?</h1>
          <p>Move between subjects without losing the thread. Each learning area is organised into explicit skills, connected prerequisites, and adaptive paths.</p>
        </header>

        {home?.activeGoal && (
          <section className="active-path-v3">
            <div><Sparkles size={17} /><span>ACTIVE PATH</span></div>
            <strong>{home.activeGoal.subject}</strong>
            <h2>{home.activeGoal.title}</h2>
            <p>{home.recommendation.message}</p>
            <button className="button button--signal" onClick={() => navigate(goalTarget)}>{home.activeSession && <Play size={14} />}{home.activeSession ? "Resume" : "Open path"}<ArrowRight size={15} /></button>
          </section>
        )}

        <section className="learning-directory">
          <header><span>SUBJECT DIRECTORY</span><p>{catalog.learningAreas.filter((area: any) => area.status === "available").length} learning areas · {catalog.goals.length} adaptive paths available</p></header>
          <div>
            {catalog.learningAreas.map((area: any, index: number) => (
              <button key={area.id} className="learning-directory__row" data-subject={area.id} onClick={() => navigate(`/learn/${area.id}`)}>
                <span className="learning-directory__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="learning-directory__mark"><LearningAreaIcon id={area.id} size={22} /></span>
                <span className="learning-directory__name"><strong>{area.title}</strong><small>{area.shortDescription}</small></span>
                <span className="learning-directory__topics">{area.populatedTopics.length ? area.populatedTopics.join(" · ") : `Grade ${learner.grade} pathways in preparation`}</span>
                <span className={`learning-directory__state ${area.status}`}>{area.status === "available" ? "ENTER" : "SOON"}</span>
                {area.status === "available" ? <MoveUpRight size={17} /> : <ArrowRight size={17} />}
              </button>
            ))}
          </div>
        </section>

        <footer className="learn-v3__footer"><Sparkles size={16} /><p>Your subject choices set the goal. Your interaction history shapes the route within it.</p></footer>
      </div>
    </AppShell>
  );
}
