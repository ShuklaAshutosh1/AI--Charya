import { ArrowLeft, Bolt, CheckCircle2, Clock3, Crown, RotateCcw, UsersRound, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getChallengeTopic, type ChallengeTopic } from "../lib/challengeTopic";
import { getStoredLearnerId } from "../lib/session";

type Phase = "setup" | "lobby" | "playing";

export function RapidFireChallengePage() {
  const learnerId = getStoredLearnerId();
  const [topic, setTopic] = useState<ChallengeTopic | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [match, setMatch] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(Date.now());

  const loadTopic = async () => {
    if (!learnerId) return;
    setError("");
    try { setTopic(await getChallengeTopic(learnerId)); }
    catch (caught: any) { setError(caught.message); }
  };

  useEffect(() => { void loadTopic(); }, [learnerId]);

  const join = async () => {
    if (!learnerId || !topic) return;
    setBusy(true); setError("");
    try {
      const nextMatch = await api.startChallenge({ learnerId, goalId: topic.id, mode: "rapid_fire" });
      setMatch(nextMatch); setPhase("lobby");
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  const begin = () => { startedAt.current = Date.now(); setTimeLeft(12); setPhase("playing"); };
  const submit = async (optionId?: string) => {
    if (!learnerId || !match || match.currentAnswered || busy) return;
    setBusy(true); setError("");
    try {
      setMatch(await api.respondToChallenge(match.id, {
        learnerId, selectedOptionId: optionId,
        responseTimeMs: Math.min(match.timerSeconds * 1000, Date.now() - startedAt.current)
      }));
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };
  const next = async () => {
    if (!learnerId || !match) return;
    setBusy(true); setError("");
    try {
      const updated = await api.nextChallengeQuestion(match.id, learnerId);
      setMatch(updated); setSelected(null); setTimeLeft(updated.timerSeconds); startedAt.current = Date.now();
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (phase !== "playing" || !match || match.currentAnswered || match.status === "complete") return;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, match?.id, match?.progress?.current, match?.currentAnswered, match?.status]);
  useEffect(() => {
    if (phase === "playing" && timeLeft === 0 && match && !match.currentAnswered && !busy) void submit();
  }, [phase, timeLeft, match?.currentAnswered, busy]);

  if (!topic && !error) return <AppShell><LoadingState label="Preparing your challenge…" /></AppShell>;
  if (!topic && error) return <AppShell><ErrorState message={error} retry={loadTopic} /></AppShell>;
  if (!topic) return null;

  if (phase === "setup" || phase === "lobby") return <AppShell><div className="page challenge-run-page">
    <Link className="back-link" to="/challenge"><ArrowLeft size={16} /> Challenge</Link>
    <header className="challenge-run-header"><span className="challenge-run-header__icon"><Bolt size={24} /></span><div><span className="page-kicker">Rapid Fire</span><h1>Fast {topic.topic} round</h1><p>Ten participants. Ten questions. Twelve seconds for each answer.</p></div></header>
    {error && <ErrorState message={error} retry={join} />}
    {phase === "setup" ? <section className="challenge-setup"><div className="challenge-setup__topic"><span>Topic</span><strong>{topic.subject} · {topic.topic}</strong><small>10 questions</small></div><div className="challenge-setup__rules"><div><Clock3 size={18} /><span>12 seconds per question</span></div><div><UsersRound size={18} /><span>Ranking updates after every answer</span></div></div><button className="button button--primary" disabled={busy} onClick={join}>{busy ? "Preparing round…" : "Join round"}</button></section> : <section className="rapid-lobby"><span className="page-kicker">Practice round ready</span><h2>{match.ranking.length} participants joined</h2><p className="practice-opponent-note">Other positions are computer-controlled for a reliable practice round.</p><div>{match.ranking.map((participant: any) => <span key={participant.id} className={participant.current ? "current" : ""}>{participant.initials}<small>{participant.current ? "You" : participant.name.split(" ")[0]}</small></span>)}</div><button className="button button--primary" onClick={begin}>Start Rapid Fire</button></section>}
  </div></AppShell>;

  if (match?.status === "complete") return <AppShell><div className="page rapid-result-page"><div className="challenge-result__mark"><Crown size={28} /></div><span className="page-kicker">Round complete</span><h1>You placed #{match.result.learnerRank}</h1><p>{match.result.correctAnswers} of {match.progress.total} correct · {match.learnerScore} points</p><section className="rapid-final-ranking">{match.ranking.map((participant: any) => <div key={participant.id} className={participant.current ? "current" : ""}><strong>{String(participant.rank).padStart(2, "0")}</strong><span>{participant.initials}</span><div><b>{participant.name}</b>{participant.current && <small>You</small>}</div><b>{participant.score}</b></div>)}</section><div className="challenge-result__actions"><button className="button button--primary" onClick={() => { setMatch(null); setPhase("setup"); setSelected(null); }}><RotateCcw size={15} /> Play again</button><Link className="button button--quiet" to="/challenge">Choose another mode</Link></div></div></AppShell>;

  const feedback = match.feedback;
  return <AppShell focused><div className="challenge-play-page challenge-play-page--rapid"><header className="challenge-play-header"><div><span>Rapid Fire · {match.topic.topic}</span><strong>Question {match.progress.current} of {match.progress.total}</strong></div><div className={`challenge-timer ${timeLeft <= 4 ? "challenge-timer--low" : ""}`}><Clock3 size={17} /><strong>{timeLeft}s</strong></div></header><div className="rapid-live-strip">{match.ranking.slice(0, 5).map((participant: any) => <div key={participant.id} className={participant.current ? "current" : ""}><span>{participant.rank}</span><strong>{participant.current ? "You" : participant.initials}</strong><small>{participant.score}</small></div>)}</div>{error && <p className="form-error" role="alert">{error}</p>}<main className="challenge-question"><span className="page-kicker">Everyone answers now</span><h1>{match.question.prompt}</h1><div className="challenge-options">{match.question.options.map((option: any) => <button key={option.id} className={selected === option.id ? "selected" : ""} disabled={match.currentAnswered || busy} onClick={() => setSelected(option.id)}><span>{option.id}</span><strong>{option.text}</strong></button>)}</div>{match.currentAnswered ? <div className={`challenge-feedback ${feedback.correct ? "correct" : "incorrect"}`}>{feedback.correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<div><strong>{feedback.correct ? "Correct" : timeLeft === 0 ? "Time’s up" : "Not quite"}</strong><span>{feedback.explanation}</span></div><button className="button button--primary" disabled={busy} onClick={next}>{match.progress.current === match.progress.total ? "Final ranking" : "Next question"}</button></div> : <button className="button button--primary challenge-submit" disabled={!selected || busy} onClick={() => void submit(selected ?? undefined)}>Submit answer</button>}</main></div></AppShell>;
}
