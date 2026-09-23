import { Circle, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";

const statusCopy: Record<string, string> = {
  limited_evidence: "Getting started",
  needs_support: "Needs practice",
  developing: "Developing",
  secure: "Confident"
};

export function SkillState({ skill, compact = false }: { skill: any; compact?: boolean }) {
  const Icon =
    skill.status === "secure"
      ? CircleCheck
      : skill.status === "needs_support"
        ? TriangleAlert
        : skill.status === "developing"
          ? Circle
          : CircleDashed;
  return (
    <div className={`skill-state skill-state--${skill.status} ${compact ? "skill-state--compact" : ""}`}>
      <Icon size={18} strokeWidth={1.8} />
      <div className="skill-state__body">
        <strong>{skill.title}</strong>
        {!compact && <span>{skill.objective}</span>}
      </div>
      <div className="skill-state__meta">
        <span>{statusCopy[skill.status] ?? skill.status}</span>
        <small>{skill.evidenceCount} practice {skill.evidenceCount === 1 ? "response" : "responses"}</small>
      </div>
    </div>
  );
}
