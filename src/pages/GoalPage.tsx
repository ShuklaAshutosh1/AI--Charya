import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, GitBranch, ScanSearch, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

export function GoalPage() {
  const { goalId } = useParams();
  const [catalog, setCatalog] = useState<any>(null);
  const [starting, setStarting] = useState<"learn" | "check" | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const learnerId = getStoredLearnerId();

  const load = async () => {
    if (!learnerId) return;
    try {
      const learner = await api.learner(learnerId);
      setCatalog(await api.catalog(learner.grade));
    } catch (caught: any) { setError(caught.message); }
  };
  useEffect(() => { void load(); }, []);
  if (!catalog && !error) return <AppShell><LoadingState /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;
  const goal = catalog.goals.find((entry: any) => entry.id === goalId);
  if (!goal) return <AppShell><ErrorState message="This learning goal is not available." /></AppShell>;
  const components = goal.knowledgeComponentIds.map((id: string) => catalog.knowledgeComponents.find((entry: any) => entry.id === id));

  const start = async (entryMode: "learn" | "check") => {
    if (!learnerId) return;
    setStarting(entryMode); setError("");
    try {
      const session = await api.startGoal(goal.id, learnerId, entryMode);
      navigate(`/session/${session.id}`);
    } catch (caught: any) {
      setError(caught.message);
    } finally { setStarting(null); }
  };

  return (
    <AppShell>
      <div className="page goal-page">
        <button className="back-link" onClick={() => navigate("/learn")}><ArrowLeft size={16} /> Learning areas</button>
        <header className="goal-hero">
          <div><span className="page-kicker">{goal.subject} · Grade {goal.grade}</span><h1>{goal.title}</h1><p>{goal.description}</p></div>
          <div className="goal-entry-actions" aria-label="Choose how to begin">
            <button className="goal-entry-option goal-entry-option--primary" onClick={() => start("learn")} disabled={Boolean(starting)}>
              <BookOpenText size={19} /><span><strong>{starting === "learn" ? "Preparing your path…" : "Learn this"}</strong><small>Start learning now. Your answers guide what comes next.</small></span><ArrowRight size={16} />
            </button>
            <button className="goal-entry-option" onClick={() => start("check")} disabled={Boolean(starting)}>
              <ScanSearch size={19} /><span><strong>{starting === "check" ? "Preparing your check…" : "Check what I know"}</strong><small>Use a short independent check to find a starting point.</small></span><ArrowRight size={16} />
            </button>
          </div>
        </header>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="goal-layout">
          <section className="goal-sequence">
            <div className="section-heading"><div><span>Learning structure</span><h2>Connected skill sequence</h2></div><GitBranch size={19} /></div>
            <ol>
              {components.map((component: any, index: number) => (
                <li key={component.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{component.shortTitle}</strong><p>{component.objective}</p>{component.prerequisites.length > 0 && <small>Depends on {component.prerequisites.length} earlier {component.prerequisites.length === 1 ? "skill" : "skills"}</small>}</div></li>
              ))}
            </ol>
          </section>
          <aside className="goal-aside">
            <div><CheckCircle2 size={19} /><h3>Choose your starting point</h3><p>Begin with teaching and practice, or take a short check when you already know some of the topic.</p></div>
            <div><Sparkles size={19} /><h3>Responsive learning</h3><p>Your route changes as you practise independently, ask for help, and connect each new skill.</p></div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
