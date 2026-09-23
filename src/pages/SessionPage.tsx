import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Compass,
  Flag,
  HelpCircle,
  Info,
  LockKeyhole,
  MessageCircle,
  Pause,
  Route,
  Send,
  ShieldCheck,
  X,
  XCircle
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { CompanionMark } from "../components/Brand";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";

const phaseCopy: Record<string, { eyebrow: string; title: string }> = {
  diagnostic: { eyebrow: "Learning calibration", title: "Map your starting point" },
  learning: { eyebrow: "Adaptive learning path", title: "Personal learning session" },
  checkpoint: { eyebrow: "Milestone review", title: "Bring the connected ideas together" }
};

const friendlyStatus: Record<string, string> = {
  limited_evidence: "Getting started",
  needs_support: "Needs practice",
  developing: "Developing",
  secure: "Confident"
};

const activityTypeLabel: Record<string, string> = {
  diagnostic_question: "Calibration prompt",
  concept_explanation: "Concept",
  worked_example: "Worked example",
  guided_practice: "Guided practice",
  independent_practice: "Independent practice",
  remediation: "Focused practice",
  review: "Review",
  checkpoint_question: "Review prompt"
};

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionBusy, setCompanionBusy] = useState("");
  const startedAt = useRef(Date.now());

  const load = async () => {
    if (!sessionId) return;
    setError("");
    try {
      const data = await api.session(sessionId);
      setSession(data);
      if (data.currentAnswered && data.lastResponse) setResult(data.lastResponse);
    } catch (caught: any) {
      setError(caught.message);
    }
  };
  useEffect(() => { void load(); }, [sessionId]);

  const submit = async (skipped = false) => {
    if (!sessionId || (!selected && !skipped)) return;
    setBusy(true); setError("");
    try {
      const response = await api.respond(sessionId, {
        selectedOptionId: selected ?? undefined,
        skipped,
        responseTimeMs: Date.now() - startedAt.current
      });
      setResult(response);
      const refreshed = await api.session(sessionId);
      setSession(refreshed);
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  const advance = async () => {
    if (!sessionId) return;
    setBusy(true); setError("");
    try {
      const data = await api.next(sessionId);
      setSession(data); setSelected(null); setResult(null); startedAt.current = Date.now();
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  const startCheckpoint = async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      const data = await api.startCheckpoint(sessionId);
      setSession(data); setResult(null); setSelected(null); startedAt.current = Date.now();
    } catch (caught: any) { setError(caught.message); }
    finally { setBusy(false); }
  };

  const askForHelp = async (kind: string) => {
    if (!sessionId) return;
    setCompanionBusy(kind); setError("");
    try {
      await api.assistance(sessionId, kind);
      await load();
    } catch (caught: any) { setError(caught.message); }
    finally { setCompanionBusy(""); }
  };

  if (!session && !error) return <AppShell focused><LoadingState label="Preparing the next learning activity…" /></AppShell>;
  if (error && !session) return <AppShell focused><ErrorState message={error} retry={load} /></AppShell>;

  if (session.phase === "checkpoint_ready") {
    return (
      <AppShell focused>
        <div className="phase-transition">
          <div className="transition-icon"><Flag size={25} /></div>
          <span className="page-kicker">Milestone review ready</span>
          <h1>Bring this learning cycle together.</h1>
          <p>Work through a short independent review. The companion can clarify wording, but it will not give hints or solution steps.</p>
          <div className="checkpoint-skills">{session.skills.map((skill: any) => <span key={skill.id}><Check size={14} /> {skill.title}</span>)}</div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--signal" onClick={startCheckpoint} disabled={busy}>Begin milestone review <ArrowRight size={17} /></button>
          <button className="text-button" onClick={() => navigate("/home")}>Pause and return later</button>
        </div>
      </AppShell>
    );
  }

  if (session.phase === "complete") {
    return (
      <AppShell focused>
        <div className="phase-transition phase-transition--complete">
          <div className="transition-icon"><CheckCircle2 size={26} /></div>
          <span className="page-kicker">Learning cycle complete</span>
          <h1>Your next direction is ready.</h1>
          <p>{session.reason.message}</p>
          <div className="checkpoint-skills">{session.skills.map((skill: any) => <span key={skill.id} className={`state-${skill.status}`}><CircleDashed size={14} /> {skill.title}: {friendlyStatus[skill.status] ?? skill.status}</span>)}</div>
          <button className="button button--signal" onClick={() => navigate("/progress")}>See your learning map <ArrowRight size={17} /></button>
          <button className="text-button" onClick={() => navigate("/home")}>Return home</button>
        </div>
      </AppShell>
    );
  }

  if (!session.activity) {
    return (
      <AppShell focused>
        <div className="phase-transition">
          <div className="transition-icon"><LockKeyhole size={24} /></div>
          <span className="page-kicker">Path paused safely</span>
          <h1>Your work has been saved.</h1>
          <p>Open your learning map to continue with another path while this route is reviewed.</p>
          <button className="button button--quiet" onClick={() => navigate(`/goals/${session.goal.id}`)}>Resume learning path</button>
        </div>
      </AppShell>
    );
  }

  const copy = phaseCopy[session.phase] ?? phaseCopy.learning;
  const assessment = session.phase === "diagnostic" || session.phase === "checkpoint";
  const messages = session.assistance?.messages ?? [];

  return (
    <AppShell focused>
      <div className={`session-page ${companionOpen ? "session-page--companion" : ""}`}>
        <header className="session-header">
          <div><span>{copy.eyebrow}</span><h1>{session.phase === "learning" ? session.goal.title : copy.title}</h1></div>
          <div className="session-header__actions">
            <span className="session-progress">{session.progress.label}</span>
            <button className="button button--quiet" onClick={() => navigate("/home")}><Pause size={15} /> Pause</button>
          </div>
        </header>

        {assessment && (
          <div className="assessment-note"><ShieldCheck size={17} /><p><strong>Work independently.</strong> The companion can clarify the question format, but it will not give hints or answers.</p></div>
        )}

        <div className="session-layout">
          <section className="learning-workspace">
            <div className="planner-reason"><Route size={18} /><div><small>Why this activity?</small><span>{session.reason.message}</span></div></div>
            <div className="activity-meta"><span>{session.activity.knowledgeComponent.shortTitle}</span><span>{activityTypeLabel[session.activity.activityType] ?? "Learning activity"}</span></div>
            {session.activity.instruction && <div className="micro-lesson"><span>Concept</span><p>{session.activity.instruction}</p></div>}
            <div className="question-block">
              {session.activity.context && <p className="question-context">{session.activity.context}</p>}
              <h2>{session.activity.prompt}</h2>
              <div className="answer-options" role="radiogroup" aria-label="Answer choices">
                {session.activity.options.map((option: any) => {
                  const chosen = selected === option.id || result?.selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      role="radio"
                      aria-checked={chosen}
                      className={chosen ? "selected" : ""}
                      disabled={Boolean(result)}
                      onClick={() => setSelected(option.id)}
                    >
                      <span>{option.id}</span><strong>{option.text}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            {result ? (
              <div className={`answer-feedback answer-feedback--${result.outcome}`}>
                <div className="answer-feedback__icon">
                  {result.outcome === "correct" ? <CheckCircle2 size={20} /> : result.outcome === "incorrect" ? <XCircle size={20} /> : <Check size={20} />}
                </div>
                <div>
                  <strong>{result.outcome === "correct" ? "That reasoning holds." : result.outcome === "incorrect" ? "Not yet—review the connection." : "Response recorded."}</strong>
                  {result.explanation && <p>{result.explanation}</p>}
                  <span>{result.contributedToModel ? "This answer will help guide your next activity." : result.assistanceUsed ? "This answer counts as guided practice because help was used." : "Your response is saved."}</span>
                </div>
              </div>
            ) : (
              <div className="response-actions">
                <button className="text-button" onClick={() => submit(true)} disabled={busy}>I’m not sure</button>
                <button className="button button--primary" onClick={() => submit(false)} disabled={!selected || busy}>{busy ? "Recording…" : "Submit response"}<Send size={15} /></button>
              </div>
            )}

            {result && <div className="response-actions response-actions--next"><span>{session.phase === "diagnostic" ? "This helps place the starting point of your path." : session.phase === "checkpoint" ? "Your full learning review appears at the end." : "Your next activity responds to this interaction."}</span><button className="button button--signal" onClick={advance} disabled={busy}>{busy ? "Composing your next move…" : "Continue"}<ChevronRight size={16} /></button></div>}
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>

          <aside className="session-context">
            <div className="context-section"><span className="context-section__label">Current skill</span><h3>{session.activity.knowledgeComponent.shortTitle}</h3><p>{session.activity.knowledgeComponent.objective}</p></div>
            <div className="context-section"><span className="context-section__label">Practice progress</span>{session.skills.filter((skill: any) => skill.id === session.activity.knowledgeComponent.id).map((skill: any) => <div key={skill.id} className={`mini-state mini-state--${skill.status}`}><span>{friendlyStatus[skill.status] ?? skill.status}</span><small>{skill.evidenceCount} practice {skill.evidenceCount === 1 ? "response" : "responses"}</small></div>)}</div>
            <button className="companion-entry" onClick={() => setCompanionOpen(true)}><CompanionMark size="small" /><div><strong>Ask the companion</strong><span>Contextual, bounded help</span></div><MessageCircle size={17} /></button>
          </aside>
        </div>

        {companionOpen && (
          <aside className="companion-panel" aria-label="AI companion">
            <header><div className="companion-title"><CompanionMark /><div><strong>AI-Charya companion</strong><span>Help within this activity</span></div></div><button className="icon-button" onClick={() => setCompanionOpen(false)} aria-label="Close companion"><X size={18} /></button></header>
            <div className="companion-context"><Compass size={16} /><p>I can explain the current idea, offer a hint, or help you take the next step.</p></div>
            {assessment && <div className="companion-guardrail"><ShieldCheck size={16} /><span>Assessment mode: clarification only</span></div>}
            <div className="conversation" aria-live="polite">
              {messages.length ? messages.map((message: any, index: number) => <div key={`${message.createdAt}-${index}`} className={`message message--${message.role}`}><span>{message.role === "learner" ? "You" : "Companion"}</span><p>{message.body}</p></div>) : <div className="conversation-empty"><HelpCircle size={19} /><p>Choose the kind of help you need.</p></div>}
            </div>
            <div className="help-actions">{session.helpActions.map((action: any) => <button key={action.kind} disabled={Boolean(result) || Boolean(companionBusy)} onClick={() => askForHelp(action.kind)}><span>{action.level}</span>{companionBusy === action.kind ? "Preparing help…" : action.label}</button>)}</div>
            {session.assistance.events.length > 0 && <div className="assistance-effect"><Info size={15} /><p>Because you asked for help, this answer will count as guided practice.</p></div>}
          </aside>
        )}
      </div>
    </AppShell>
  );
}
