import { ArrowRight, Bolt, Clock3, Swords, Trophy, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { getChallengeTopic, type ChallengeTopic } from "../lib/challengeTopic";
import { getStoredLearnerId } from "../lib/session";

export function ChallengePage() {
  const learnerId = getStoredLearnerId();
  const [topic, setTopic] = useState<ChallengeTopic | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!learnerId) return;
    setError("");
    try { setTopic(await getChallengeTopic(learnerId)); }
    catch (caught: any) { setError(caught.message); }
  };
  useEffect(() => { void load(); }, [learnerId]);

  if (!topic && !error) return <AppShell><LoadingState label="Preparing challenges…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;
  if (!topic) return null;

  return (
    <AppShell>
      <div className="page challenge-page">
        <header className="page-header page-header--compact challenge-header">
          <div><span className="page-kicker">Challenge</span><h1>Put your skills to the test.</h1><p>Choose a fast, low-stakes round against computer-controlled practice opponents.</p></div>
          <div className="challenge-header__stat"><Trophy size={18} /><div><strong>3 wins</strong><span>This week</span></div></div>
        </header>

        <section className="challenge-modes" aria-label="Challenge modes">
          <Link className="challenge-mode-card" to="/challenge/1v1">
            <div className="challenge-mode-card__top"><span><Swords size={24} /></span><small>Head to head</small></div>
            <h2>1v1 Challenge</h2>
            <p>Face one learner in a focused five-question {topic.topic} round.</p>
            <div className="challenge-mode-card__meta"><span><Clock3 size={14} /> About 3 minutes</span><span><UsersRound size={14} /> 2 learners</span></div>
            <strong className="challenge-mode-card__action">Choose 1v1 <ArrowRight size={16} /></strong>
          </Link>
          <Link className="challenge-mode-card challenge-mode-card--rapid" to="/challenge/rapid-fire">
            <div className="challenge-mode-card__top"><span><Bolt size={24} /></span><small>Fast round</small></div>
            <h2>Rapid Fire</h2>
            <p>Join a ten-question round with learners practising the same topic.</p>
            <div className="challenge-mode-card__meta"><span><Clock3 size={14} /> About 5 minutes</span><span><UsersRound size={14} /> Up to 10</span></div>
            <strong className="challenge-mode-card__action">Join Rapid Fire <ArrowRight size={16} /></strong>
          </Link>
        </section>

        <section className="challenge-topic-strip">
          <div><span className="page-kicker">Available topic · Grade {topic.grade}</span><h2>{topic.subject} · {topic.topic}</h2><p>Competitive practice uses the structured question bank while staying separate from your learning progress.</p></div>
          <span className="availability availability--available">Ready to play</span>
        </section>
      </div>
    </AppShell>
  );
}
