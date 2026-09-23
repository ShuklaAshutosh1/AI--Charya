import { Sparkles } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="AI-Charya">
      <div className="brand__mark" aria-hidden="true">
        <span>अ</span>
        <Sparkles size={11} strokeWidth={1.8} />
      </div>
      {!compact && (
        <div>
          <strong>AI-Charya</strong>
          <small>Adaptive learning</small>
        </div>
      )}
    </div>
  );
}

export function CompanionMark({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  return (
    <div className={`companion-mark companion-mark--${size}`} aria-hidden="true">
      <span>अ</span>
      <i />
    </div>
  );
}
