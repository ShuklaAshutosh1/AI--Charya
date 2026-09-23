import { Accessibility, Award, BookMarked, CalendarClock, Check, ChevronRight, CircleUserRound, EyeOff, Languages, LockKeyhole, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";
import { getStoredLearnerId } from "../lib/session";

interface Preferences { interfaceLanguage: string; sessionLengthMinutes: number; reduceMotion: boolean; largerText: boolean; privateProfile: boolean; }
const DEFAULT_PREFERENCES: Preferences = { interfaceLanguage: "English", sessionLengthMinutes: 20, reduceMotion: false, largerText: false, privateProfile: true };
function formatDate(value: string): string { return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function sessionLabel(session: any): string { if (session.status === "complete") return "Completed"; if (session.phase === "diagnostic") return "Starting check in progress"; if (session.phase === "checkpoint" || session.phase === "checkpoint_ready") return "Checkpoint in progress"; return "Learning in progress"; }

export function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const learnerId = getStoredLearnerId();
  const navigate = useNavigate();
  const load = async () => {
    if (!learnerId) return;
    try {
      const [overview, nextPreferences] = await Promise.all([
        api.profileOverview(learnerId),
        api.preferences(learnerId)
      ]);
      setData(overview);
      setPreferences(nextPreferences);
    } catch (caught: any) {
      setError(caught.message);
    }
  };
  useEffect(() => { void load(); }, [learnerId]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", Boolean(preferences?.reduceMotion));
    document.documentElement.classList.toggle("larger-text", Boolean(preferences?.largerText));
  }, [preferences]);
  const savePreferences = async () => {
    if (!learnerId || !preferences) return;
    try {
      const savedPreferences = await api.updatePreferences(learnerId, { ...preferences });
      setPreferences(savedPreferences);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (caught: any) {
      setError(caught.message);
    }
  };
  if (!data && !error) return <AppShell><LoadingState label="Opening your profile…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;
  const learner = data.learner;

  return (
    <AppShell>
      <div className="page profile-page profile-page--complete">
        <header className="profile-header"><div className="profile-avatar"><CircleUserRound size={28} /></div><div><span className="page-kicker">Learner profile</span><h1>{learner.name}</h1><p>Grade {learner.grade} · Independent learner · Joined {formatDate(learner.createdAt)}</p></div></header>
        <nav className="profile-jump" aria-label="Profile sections"><a href="#overview">Overview</a><a href="#preferences">Preferences</a><a href="#history">Learning history</a><a href="#privacy">Privacy & account</a></nav>

        <section className="profile-section" id="overview"><div className="profile-section__heading"><div><span>Overview</span><h2>Your learning profile</h2></div></div><div className="profile-overview-grid"><div className="profile-fact"><CircleUserRound size={18} /><span>Learner</span><strong>{learner.name}</strong><small>Grade {learner.grade}</small></div><div className="profile-fact"><BookMarked size={18} /><span>Active goals</span><strong>{data.activeGoals.filter((goal: any) => goal.status === "active").length}</strong><small>{data.activeGoals[0]?.title ?? "No goal started"}</small></div><div className="profile-fact"><CalendarClock size={18} /><span>Learning sessions</span><strong>{data.sessionHistory.length}</strong><small>Your recent learning history</small></div></div>
          {data.activeGoals.length > 0 && <div className="profile-goals"><h3>Learning goals</h3>{data.activeGoals.map((goal: any) => <button key={goal.id} onClick={() => navigate(`/goals/${goal.id}`)}><span className="profile-goals__subject">{goal.subject}</span><div><strong>{goal.title}</strong><span>{goal.topic} · {goal.status === "active" ? "In progress" : "Complete"}</span></div><ChevronRight size={16} /></button>)}</div>}
          <div className="profile-achievements"><div className="profile-achievements__heading"><div><Award size={18} /><h3>Achievements</h3></div><span>Keep learning to unlock more</span></div><div>{data.engagement.achievements.map((achievement: any) => <article key={achievement.id}><Award size={18} /><div><strong>{achievement.title}</strong><span>{achievement.description}</span></div><small>{achievement.state === "earned" ? "Earned" : "In progress"}</small></article>)}</div></div>
        </section>

        <section className="profile-section" id="preferences"><div className="profile-section__heading"><div><span>Preferences</span><h2>Learning and accessibility</h2></div><SlidersHorizontal size={19} /></div><div className="preference-list"><label className="preference-row"><Languages size={18} /><div><strong>Interface language</strong><span>The current learning experience is available in English.</span></div><select value={preferences.interfaceLanguage} onChange={(event) => setPreferences({ ...preferences, interfaceLanguage: event.target.value })}><option>English</option></select></label><label className="preference-row"><CalendarClock size={18} /><div><strong>Preferred session length</strong><span>Choose a comfortable learning rhythm.</span></div><select value={preferences.sessionLengthMinutes} onChange={(event) => setPreferences({ ...preferences, sessionLengthMinutes: Number(event.target.value) })}><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select></label><label className="preference-row"><Accessibility size={18} /><div><strong>Reduce motion</strong><span>Minimise movement across the interface.</span></div><input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => setPreferences({ ...preferences, reduceMotion: event.target.checked })} /></label><label className="preference-row"><Settings2 size={18} /><div><strong>Larger interface text</strong><span>Increase text size for easier reading.</span></div><input type="checkbox" checked={preferences.largerText} onChange={(event) => setPreferences({ ...preferences, largerText: event.target.checked })} /></label></div><div className="preference-actions"><span>{saved ? <><Check size={14} /> Preferences saved</> : "Choose how AI-Charya works best for you."}</span><button className="button button--quiet" onClick={savePreferences}>Save preferences</button></div></section>

        <section className="profile-section" id="history"><div className="profile-section__heading"><div><span>History</span><h2>Learning sessions</h2></div></div>{data.sessionHistory.length ? <div className="session-history">{data.sessionHistory.map((session: any) => <button key={session.id} onClick={() => session.status === "active" && navigate(`/session/${session.id}`)} disabled={session.status !== "active"}><div><strong>{session.title}</strong><span>{sessionLabel(session)}</span></div><time>{formatDate(session.updatedAt)}</time>{session.status === "active" && <ChevronRight size={16} />}</button>)}</div> : <div className="activity-empty"><CalendarClock size={18} /><span>Your learning sessions will appear here.</span></div>}</section>

        <section className="profile-section" id="privacy"><div className="profile-section__heading"><div><span>Privacy & account</span><h2>Your settings</h2></div><ShieldCheck size={19} /></div><div className="privacy-boundaries"><div><LockKeyhole size={18} /><div><strong>Private learning profile</strong><span>Your learning profile is visible only to you in this account.</span></div></div><div><EyeOff size={18} /><div><strong>Companion privacy</strong><span>Your help conversations stay private within your learning experience.</span></div></div><div><ShieldCheck size={18} /><div><strong>Learning activity</strong><span>You control who can view your learning activity.</span></div></div></div><div className="account-controls"><label><EyeOff size={18} /><div><strong>Private profile</strong><span>Keep your profile and activity private.</span></div><input type="checkbox" checked={preferences.privateProfile} onChange={(event) => setPreferences({ ...preferences, privateProfile: event.target.checked })} /></label></div><div className="privacy-principle"><ShieldCheck size={19} /><p>AI-Charya does not sell learner data or show targeted advertising.</p></div><div className="preference-actions"><span>{saved ? <><Check size={14} /> Settings saved</> : "Review and save your account settings."}</span><button className="button button--quiet" onClick={savePreferences}>Save settings</button></div></section>
      </div>
    </AppShell>
  );
}
