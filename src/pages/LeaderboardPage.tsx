import { ArrowLeft, Crown, Flame, Medal, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ErrorState, LoadingState } from "../components/Status";
import { api } from "../lib/api";

export function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const load = () => api.leaderboard().then(setData).catch((caught) => setError(caught.message));
  useEffect(() => { void load(); }, []);
  if (!data && !error) return <AppShell><LoadingState label="Loading leaderboard…" /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} retry={load} /></AppShell>;
  const podium = [data.entries[1], data.entries[0], data.entries[2]];

  return (
    <AppShell>
      <div className="page leaderboard-page leaderboard-page--final">
        <Link className="back-link" to="/home"><ArrowLeft size={16} /> Home</Link>
        <header className="leaderboard-header">
          <div><span className="page-kicker">Leaderboard</span><h1>Weekly leaderboard</h1><p>Keep learning, build your streak, and move up the board.</p></div>
          <div className="leaderboard-header__period"><Trophy size={18} /><span>{data.period}</span></div>
        </header>
        <section className="leaderboard-podium" aria-label="Top three learners">
          {podium.map((entry: any) => (
            <article className={`podium-place podium-place--${entry.rank} ${entry.current ? "podium-place--current" : ""}`} key={entry.rank}>
              <div className="podium-place__award">{entry.rank === 1 ? <Crown size={20} /> : <Medal size={19} />}</div>
              <span className="podium-place__avatar">{entry.initials}</span>
              <div className="podium-place__name"><strong>{entry.name}</strong>{entry.current && <small>You</small>}</div>
              <strong className="podium-place__xp">{entry.xp} XP</strong>
              <div className="podium-place__details"><span><Flame size={13} /> {entry.streakDays} days</span><span><Target size={13} /> {entry.accuracy}%</span></div>
              <div className="podium-place__rank">{entry.rank}</div>
            </article>
          ))}
        </section>
        <div className="leaderboard-list-heading"><div><span>All learners</span><h2>Full ranking</h2></div><small>{data.entries.length} learners</small></div>
        <section className="leaderboard-table" aria-label="Weekly leaderboard">
          <div className="leaderboard-table__head"><span>Rank</span><span>Learner</span><span>Streak</span><span>Accuracy</span><span>XP</span></div>
          {data.entries.map((entry: any) => (
            <div className={`leaderboard-entry ${entry.current ? "leaderboard-entry--current" : ""}`} key={entry.rank}>
              <strong className="leaderboard-entry__rank">{String(entry.rank).padStart(2, "0")}</strong>
              <div className="leaderboard-entry__learner"><span>{entry.initials}</span><strong>{entry.name}{entry.current && <small>You</small>}</strong></div>
              <span><Flame size={14} /> {entry.streakDays} days</span>
              <span><Target size={14} /> {entry.accuracy}%</span>
              <strong>{entry.xp}</strong>
            </div>
          ))}
        </section>
        <div className="leaderboard-tip"><Trophy size={17} /><p>Complete learning activities and maintain your streak to earn XP.</p></div>
      </div>
    </AppShell>
  );
}
