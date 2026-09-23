import { ArrowLeft, CheckCircle2, Clock3, Crown, RotateCcw, Swords, Timer, Trophy, UserRound, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getChallengeTopic, type ChallengeTopic } from "../lib/challengeTopic";
import { getStoredLearnerId } from "../lib/session";

type Phase = "setup" | "matched" | "playing";

export function OneVsOneChallengePage() {
  const learnerId = getStoredLearnerId();
  const [topic, setTopic] = useState<ChallengeTopic | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [match, setMatch] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
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

  const startMatch = async () => {
    if (!learnerId || !topic) return;
    setBusy(true); setError("");
    try {
      const nextMatch = await api.startChallenge({ learnerId, goalId: topic.id, mode: "one_v_one" });
      setMatch(nextMatch); setPhase("matched");
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  const begin = () => {
    startedAt.current = Date.now(); setTimeLeft(match.timerSeconds); setPhase("playing");
  };

  const submit = async (optionId?: string) => {
    if (!learnerId || !match || match.currentAnswered || busy) return;
    setBusy(true); setError("");
    try {
      setMatch(await api.respondToChallenge(match.id, {
        learnerId,
        selectedOptionId: optionId,
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

  if (phase === "setup" || phase === "matched") {
    const current = match?.ranking?.find((participant: any) => participant.current);
    const opponent = match?.ranking?.find((participant: any) => !participant.current);
    return <AppShell><div className="page challenge-run-page">
      <Link className="back-link" to="/challenge"><ArrowLeft size={16} /> Challenge</Link>
      <header className="challenge-run-header"><span className="challenge-run-header__icon"><Swords size={24} /></span><div><span className="page-kicker">1v1 Challenge</span><h1>{topic.topic} face-off</h1><p>Five questions. Fifteen seconds each. Quick thinking earns a small score bonus.</p></div></header>
      {error && <ErrorState message={error} retry={startMatch} />}
      {phase === "setup" ? <section className="challenge-setup">
        <div className="challenge-setup__topic"><span>Topic</span><strong>{topic.subject} · {topic.topic}</strong><small>5 questions</small></div>
        <div className="challenge-setup__rules"><div><Timer size={18} /><span>15 seconds per question</span></div><div><Trophy size={18} /><span>Correct answers and speed build your score</span></div></div>
        <button className="button button--primary" disabled={busy} onClick={startMatch}>{busy ? "Finding opponent…" : "Find an opponent"}</button>
      </section> : !match ? <LoadingState /> : <section className="match-found">
        <span className="page-kicker">Practice match ready</span>
        <div className="match-found__players"><div><span>{current.initials}</span><strong>{current.name}</strong><small>You</small></div><Swords size={24} /><div><span>{opponent.initials}</span><strong>{opponent.name}</strong><small>Computer-controlled opponent</small></div></div>
        <button className="button button--primary" onClick={begin}>Start challenge</button>
      </section>}
    </div></AppShell>;
  }

  if (!match) return <AppShell><LoadingState /></AppShell>;
  if (match.status === "complete") {
    const current = match.ranking.find((participant: any) => participant.current);
    const opponent = match.ranking.find((participant: any) => !participant.current);
    const won = current.rank <= opponent.rank;
    return <AppShell><div className="page challenge-result-page">
      <div className="challenge-result__mark">{won ? <Crown size={28} /> : <Trophy size={28} />}</div>
      <span className="page-kicker">Challenge complete</span><h1>{won ? "You won the round" : "A close match"}</h1><p>{match.result.correctAnswers} of {match.progress.total} correct · {match.topic.topic}</p>
      <div className="challenge-result__scores"><div className={won ? "winner" : ""}><span>You</span><strong>{current.score}</strong><small>{match.result.correctAnswers} correct</small></div><div className={!won ? "winner" : ""}><span>{opponent.name}</span><strong>{opponent.score}</strong><small>Practice opponent</small></div></div>
      <div className="challenge-result__actions"><button className="button button--primary" onClick={() => { setMatch(null); setPhase("setup"); setSelected(null); }}><RotateCcw size={15} /> Play again</button><Link className="button button--quiet" to="/challenge">Choose another mode</Link></div>
    </div></AppShell>;
  }

  const current = match.ranking.find((participant: any) => participant.current);
  const opponent = match.ranking.find((participant: any) => !participant.current);
  const feedback = match.feedback;
  return <AppShell focused><div className="challenge-play-page">
    <header className="challenge-play-header"><div><span>1v1 · {match.topic.topic}</span><strong>Question {match.progress.current} of {match.progress.total}</strong></div><div className={`challenge-timer ${timeLeft <= 5 ? "challenge-timer--low" : ""}`}><Clock3 size={17} /><strong>{timeLeft}s</strong></div></header>
    <div className="duel-status"><div><UserRound size={16} /><span>You</span><strong>{current.score}</strong></div><div className="duel-status__track"><i style={{ width: `${(match.progress.answered / match.progress.total) * 100}%` }} /></div><div><strong>{opponent.score}</strong><span>{opponent.name}</span><UserRound size={16} /></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <main className="challenge-question">
      <span className="page-kicker">{match.topic.topic} · Quick response</span><h1>{match.question.prompt}</h1>
      <div className="challenge-options">{match.question.options.map((option: any) => <button key={option.id} className={selected === option.id ? "selected" : ""} disabled={match.currentAnswered || busy} onClick={() => setSelected(option.id)}><span>{option.id}</span><strong>{option.text}</strong></button>)}</div>
      {match.currentAnswered ? <div className={`challenge-feedback ${feedback.correct ? "correct" : "incorrect"}`}>{feedback.correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<div><strong>{feedback.correct ? "Correct" : timeLeft === 0 ? "Time’s up" : "Not quite"}</strong><span>{feedback.explanation}</span></div><button className="button button--primary" disabled={busy} onClick={next}>{match.progress.current === match.progress.total ? "See results" : "Next question"}</button></div> : <button className="button button--primary challenge-submit" disabled={!selected || busy} onClick={() => void submit(selected ?? undefined)}>Lock in answer</button>}
    </main>
  </div></AppShell>;
}
