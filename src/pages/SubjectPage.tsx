import { ArrowLeft, ArrowRight, Check, Clock3, MoveUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { LearningAreaIcon } from "../components/LearningAreaIcon";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

export function SubjectPage() {
  const { subjectId } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const learnerId = getStoredLearnerId();

  const load = async () => {
    if (!learnerId) return;
    setError("");
    try {
      const learner = await api.learner(learnerId);
      const catalog = await api.catalog(learner.grade);
      const area = catalog.learningAreas.find((entry: any) => entry.id === subjectId);
      if (!area) throw new Error("This learning area does not exist.");
      const goals = catalog.goals.filter((goal: any) => goal.subject === area.title);
      setData({ learner, catalog, area, goals });
    } catch (caught: any) { setError(caught.message); }
  };
  useEffect(() => { void load(); }, [learnerId, subjectId]);

  if (!data && !error) return <AppShell><LoadingState label="Opening learning area…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;
  const { area, learner, goals } = data;

  return (
    <AppShell>
      <div className="page subject-v3" data-subject={area.id}>
        <button className="back-link" onClick={() => navigate("/learn")}><ArrowLeft size={15} /> All learning areas</button>

        <header className="subject-v3__hero">
          <div className="subject-v3__identity">
            <span className="subject-v3__icon"><LearningAreaIcon id={area.id} size={28} /></span>
            <span>GRADE {learner.grade} / LEARNING AREA</span>
          </div>
          <h1>{area.title}</h1>
          <p>{area.shortDescription}</p>
          <div className="subject-v3__orbit" aria-hidden="true"><i /><i /><span>{String(area.title).slice(0, 2).toUpperCase()}</span></div>
        </header>

        {area.status === "available" && goals.length ? (
          <>
            <section className="path-collection">
              <header><span>ADAPTIVE PATHS / AVAILABLE NOW</span><p>Begin with a short learning calibration. The route changes as you work.</p></header>
              {goals.map((goal: any, index: number) => (
                <button className="path-collection__row" key={goal.id} onClick={() => navigate(`/goals/${goal.id}`)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><small>{goal.topic} · {goal.knowledgeComponentIds.length} connected skills</small><h2>{goal.title}</h2><p>{goal.description}</p></div>
                  <strong>OPEN PATH <MoveUpRight size={16} /></strong>
                </button>
              ))}
            </section>

            <section className="subject-roadmap">
              <header><span>THE WIDER LEARNING MAP</span><h2>Where this subject can take you.</h2></header>
              <div>{area.roadmapTopics.map((topic: string, index: number) => <span key={topic}><i>{String(index + 1).padStart(2, "0")}</i>{topic}{area.populatedTopics.includes(topic) && <Check size={13} />}</span>)}</div>
            </section>
          </>
        ) : (
          <section className="subject-waiting-v3">
            <Clock3 size={23} />
            <span>GRADE {learner.grade} PATHWAY</span>
            <h2>This learning area is being prepared with care.</h2>
            <p>Its skills, explanations, and assessments need to be complete before they become part of your learning record.</p>
            <Link className="button button--quiet" to="/learn">Choose another area <ArrowRight size={15} /></Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
