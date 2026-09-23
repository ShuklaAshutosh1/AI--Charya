import { CheckCircle2, CircleDashed, MessageCircleMore, ShieldCheck } from "lucide-react";

function formatRelative(value: string): string {
  const timestamp = new Date(value).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function ActivityList({ activity, empty }: { activity: any[]; empty: string }) {
  if (!activity.length) {
    return <div className="activity-empty"><CircleDashed size={19} /><span>{empty}</span></div>;
  }
  return (
    <div className="activity-list">
      {activity.map((entry) => {
        const Icon = entry.assisted
          ? MessageCircleMore
          : entry.mode === "checkpoint" || entry.mode === "diagnostic"
            ? ShieldCheck
            : CheckCircle2;
        return (
          <div className="activity-item" key={entry.id}>
            <div className="activity-item__icon"><Icon size={16} /></div>
            <div className="activity-item__copy">
              <strong>{entry.title}</strong>
              <span>{entry.detail}</span>
            </div>
            <time dateTime={entry.createdAt}>{formatRelative(entry.createdAt)}</time>
          </div>
        );
      })}
    </div>
  );
}
